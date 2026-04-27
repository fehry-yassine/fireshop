import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CartItem,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Product,
  ProductStatus,
  User,
  Vendor,
  VendorStatus,
} from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/public-user';

type CheckoutPayload = {
  customerName?: unknown;
  phone?: unknown;
  address?: unknown;
  city?: unknown;
  governorate?: unknown;
  postalCode?: unknown;
  notes?: unknown;
};

type StatusPayload = {
  status?: unknown;
};

type CartItemWithProduct = CartItem & {
  product: Product & { vendor: Vendor };
};

type OrderWithRelations = Order & {
  buyer: User;
  vendor: Vendor;
  items: OrderItem[];
};

const ORDER_STATUS_FLOW: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

const V1_ORDER_STATUSES = Object.keys(ORDER_STATUS_FLOW);

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async checkout(currentUser: AuthTokenPayload, payload: unknown) {
    const user = await this.findActiveUser(currentUser.sub);
    const body = this.asCheckoutPayload(payload);
    const shippingFullName = this.requiredString(
      body.customerName,
      'customerName',
    );
    const shippingPhone = this.requiredString(body.phone, 'phone');
    const shippingAddressLine1 = this.requiredString(body.address, 'address');
    const shippingCity = this.requiredString(body.city, 'city');
    const shippingGovernorate =
      this.optionalString(body.governorate, 'governorate') ?? shippingCity;
    const shippingPostalCode = this.optionalString(body.postalCode, 'postalCode');
    const notes = this.optionalString(body.notes, 'notes');

    const order = await this.prisma.$transaction(async (tx) => {
      const cartItems = await tx.cartItem.findMany({
        where: { userId: user.id },
        include: { product: { include: { vendor: true } } },
        orderBy: { createdAt: 'asc' },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const vendorIds = new Set(cartItems.map((item) => item.product.vendorId));

      if (vendorIds.size !== 1) {
        throw new ConflictException(
          'Checkout supports one vendor per order in V1',
        );
      }

      for (const item of cartItems) {
        this.ensureOrderableProduct(item);
        this.ensureStockAvailable(item.product, item.quantity);
      }

      const subtotal = this.money(
        cartItems.reduce(
          (sum, item) => sum + this.unitPrice(item.product) * item.quantity,
          0,
        ),
      );
      const deliveryFee = 0;
      const total = this.money(subtotal + deliveryFee);
      const vendorId = cartItems[0].product.vendorId;

      const createdOrder = await tx.order.create({
        data: {
          buyerId: user.id,
          vendorId,
          shippingFullName,
          shippingPhone,
          shippingAddressLine1,
          shippingCity,
          shippingGovernorate,
          shippingPostalCode,
          subtotal,
          deliveryFee,
          total,
          status: OrderStatus.PENDING,
          paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
          paymentStatus: PaymentStatus.UNPAID,
          notes,
          items: {
            create: cartItems.map((item) => {
              const unitPrice = this.unitPrice(item.product);
              return {
                productId: item.productId,
                productName: item.product.name,
                productSlug: item.product.slug,
                unitPrice,
                quantity: item.quantity,
                subtotal: this.money(unitPrice * item.quantity),
              };
            }),
          },
        },
        include: this.orderInclude(),
      });

      for (const item of cartItems) {
        const updateResult = await tx.product.updateMany({
          where: {
            id: item.productId,
            isActive: true,
            status: ProductStatus.PUBLISHED,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (updateResult.count !== 1) {
          throw new BadRequestException(
            `${item.product.name} no longer has enough stock`,
          );
        }
      }

      await tx.cartItem.deleteMany({ where: { userId: user.id } });

      return createdOrder;
    });

    return { order: this.toOrderResponse(order) };
  }

  async findBuyerOrders(currentUser: AuthTokenPayload) {
    const user = await this.findActiveUser(currentUser.sub);
    const orders = await this.prisma.order.findMany({
      where: { buyerId: user.id },
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toOrderResponse(order));
  }

  async findBuyerOrderById(currentUser: AuthTokenPayload, id: string) {
    const user = await this.findActiveUser(currentUser.sub);
    const order = await this.prisma.order.findFirst({
      where: { id, buyerId: user.id },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.toOrderResponse(order);
  }

  async findVendorOrders(currentUser: AuthTokenPayload) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const orders = await this.prisma.order.findMany({
      where: { vendorId: vendor.id },
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toOrderResponse(order));
  }

  async updateVendorOrderStatus(
    currentUser: AuthTokenPayload,
    id: string,
    payload: unknown,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const order = await this.prisma.order.findFirst({
      where: { id, vendorId: vendor.id },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.updateOrderStatus(order, payload);
  }

  async findAllAdmin(status?: unknown) {
    const selectedStatus = this.optionalOrderStatus(status);
    const orders = await this.prisma.order.findMany({
      where: selectedStatus ? { status: selectedStatus } : undefined,
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => this.toOrderResponse(order));
  }

  async updateAdminOrderStatus(id: string, payload: unknown) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.updateOrderStatus(order, payload);
  }

  private async updateOrderStatus(order: OrderWithRelations, payload: unknown) {
    const body = this.asStatusPayload(payload);
    const nextStatus = this.requiredOrderStatus(body.status);

    this.validateStatusTransition(order.status, nextStatus);

    if (order.status === nextStatus) {
      return { order: this.toOrderResponse(order) };
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { status: nextStatus },
      include: this.orderInclude(),
    });

    return { order: this.toOrderResponse(updatedOrder) };
  }

  private async findActiveUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return user;
  }

  private async findActiveVendorForUser(userId: string) {
    const user = await this.findActiveUser(userId);
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });

    if (
      !vendor ||
      !vendor.isActive ||
      vendor.status !== VendorStatus.APPROVED
    ) {
      throw new ForbiddenException('Active vendor profile is required');
    }

    return vendor;
  }

  private ensureOrderableProduct(item: CartItemWithProduct) {
    if (
      !item.product.isActive ||
      item.product.status !== ProductStatus.PUBLISHED
    ) {
      throw new BadRequestException(
        `${item.product.name} is not available for ordering`,
      );
    }
  }

  private ensureStockAvailable(product: Product, quantity: number) {
    if (quantity > product.stockQuantity) {
      throw new BadRequestException(
        `${product.name} does not have enough stock`,
      );
    }
  }

  private validateStatusTransition(
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
  ) {
    if (currentStatus === nextStatus) {
      return;
    }

    const allowedNextStatuses = ORDER_STATUS_FLOW[currentStatus] ?? [];

    if (!allowedNextStatuses.includes(nextStatus)) {
      throw new BadRequestException(
        `Order status cannot change from ${currentStatus} to ${nextStatus}`,
      );
    }
  }

  private orderInclude() {
    return {
      buyer: true,
      vendor: true,
      items: { orderBy: { createdAt: 'asc' as const } },
    };
  }

  private toOrderResponse(order: OrderWithRelations) {
    return {
      id: order.id,
      status: order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      shipping: {
        fullName: order.shippingFullName,
        phone: order.shippingPhone,
        address: order.shippingAddressLine1,
        addressLine2: order.shippingAddressLine2,
        city: order.shippingCity,
        governorate: order.shippingGovernorate,
        postalCode: order.shippingPostalCode,
      },
      subtotal: this.money(Number(order.subtotal)),
      deliveryFee: this.money(Number(order.deliveryFee)),
      total: this.money(Number(order.total)),
      notes: order.notes,
      buyer: toPublicUser(order.buyer),
      vendor: {
        id: order.vendor.id,
        storeName: order.vendor.storeName,
        slug: order.vendor.slug,
      },
      items: order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productSlug: item.productSlug,
        unitPrice: this.money(Number(item.unitPrice)),
        quantity: item.quantity,
        subtotal: this.money(Number(item.subtotal)),
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private asCheckoutPayload(payload: unknown): CheckoutPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as CheckoutPayload;
  }

  private asStatusPayload(payload: unknown): StatusPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as StatusPayload;
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private optionalString(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private optionalOrderStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.requiredOrderStatus(value);
  }

  private requiredOrderStatus(value: unknown) {
    if (typeof value !== 'string' || !V1_ORDER_STATUSES.includes(value)) {
      throw new BadRequestException('status is invalid');
    }

    return value as OrderStatus;
  }

  private unitPrice(product: Product) {
    return this.money(Number(product.offerPrice ?? product.price));
  }

  private money(value: number) {
    return Number(value.toFixed(2));
  }
}
