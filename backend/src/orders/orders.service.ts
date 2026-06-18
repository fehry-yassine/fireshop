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
  Category,
  NotificationType,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  Product,
  ProductImage,
  ProductStatus,
  User,
  Vendor,
  VendorStatus,
} from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
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

type VendorOrderUpdatePayload = {
  status?: unknown;
  fullName?: unknown;
  phone?: unknown;
  address?: unknown;
  city?: unknown;
  governorate?: unknown;
  postalCode?: unknown;
  notes?: unknown;
};

type VendorOrderQuery = {
  deleted?: unknown;
  search?: unknown;
  status?: unknown;
  page?: unknown;
  limit?: unknown;
};

type AdminOrderQuery = {
  status?: unknown;
  page?: unknown;
  limit?: unknown;
};

type CartItemWithProduct = CartItem & {
  product: Product & {
    category: Category;
    vendor: Vendor & { user: User };
  };
};

type OrderWithRelations = Order & {
  buyer: User;
  vendor: Vendor;
  items: Array<
    OrderItem & {
      product: Product & {
        images: ProductImage[];
      };
    }
  >;
};

const ORDER_STATUS_FLOW: Record<string, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [
    OrderStatus.SHIPPED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.SHIPPED]: [
    OrderStatus.DELIVERED,
    OrderStatus.RETURNED,
  ],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.RETURNED]: [],
  [OrderStatus.CANCELLED]: [],
};

const V1_ORDER_STATUSES = Object.keys(ORDER_STATUS_FLOW);
const REVENUE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
];
const EXPECTED_REVENUE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
];
const OPEN_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CONFIRMED,
  OrderStatus.SHIPPED,
];
const STOCK_RESTORE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CANCELLED,
  OrderStatus.RETURNED,
];
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

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
        include: {
          product: {
            include: {
              category: true,
              vendor: { include: { user: true } },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      const vendorIds = new Set(cartItems.map((item) => item.product.vendorId));

      if (vendorIds.size !== 1) {
        throw new ConflictException(
          'Single-vendor checkout only. Please order from one vendor at a time.',
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
            category: { isActive: true },
            vendor: {
              isActive: true,
              status: VendorStatus.APPROVED,
              user: { isActive: true },
            },
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

    // Fire-and-forget — never block the response on notification/email failures
    void this.notificationsService
      .create(
        order.buyerId,
        NotificationType.ORDER_PLACED,
        'Commande passée',
        `Votre commande auprès de ${order.vendor.storeName} a bien été reçue.`,
        { orderId: order.id },
      )
      .catch((err) => console.error('[notify] checkout buyer:', err));

    void this.notificationsService
      .create(
        order.vendor.userId,
        NotificationType.NEW_ORDER_RECEIVED,
        'Nouvelle commande reçue',
        `Vous avez reçu une nouvelle commande.`,
        { orderId: order.id },
      )
      .catch((err) => console.error('[notify] checkout vendor:', err));

    void this.emailService
      .sendOrderPlacedEmail(
        order.buyer.email,
        order.id,
        order.vendor.storeName,
        this.money(Number(order.total)),
      )
      .catch((err) => console.error('[email] checkout:', err));

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

  async findVendorOrders(
    currentUser: AuthTokenPayload,
    query: VendorOrderQuery = {},
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const selectedStatus = this.optionalOrderStatus(query.status);
    const showDeleted = this.optionalBoolean(query.deleted);
    const search = this.optionalString(query.search, 'search');
    const pagination = this.parsePagination(query);
    const where: Prisma.OrderWhereInput = {
      vendorId: vendor.id,
      vendorDeletedAt: showDeleted ? { not: null } : null,
    };

    if (selectedStatus) {
      where.status = selectedStatus;
    }

    if (search) {
      where.OR = [
        { id: { contains: search, mode: 'insensitive' } },
        { shippingFullName: { contains: search, mode: 'insensitive' } },
        { shippingPhone: { contains: search, mode: 'insensitive' } },
        { shippingCity: { contains: search, mode: 'insensitive' } },
        {
          items: {
            some: {
              OR: [
                { productName: { contains: search, mode: 'insensitive' } },
                { productSlug: { contains: search, mode: 'insensitive' } },
              ],
            },
          },
        },
      ];
    }

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return this.paginated(
      orders.map((order) => this.toOrderResponse(order)),
      pagination,
      total,
    );
  }

  async findVendorDashboard(currentUser: AuthTokenPayload) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const now = new Date();
    const startOfToday = this.startOfDay(now);
    const startOfWeek = this.startOfWeek(now);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const baseWhere: Prisma.OrderWhereInput = {
      vendorId: vendor.id,
      vendorDeletedAt: null,
    };
    const revenueWhere: Prisma.OrderWhereInput = {
      ...baseWhere,
      status: { in: REVENUE_ORDER_STATUSES },
    };
    const expectedRevenueWhere: Prisma.OrderWhereInput = {
      ...baseWhere,
      status: { in: EXPECTED_REVENUE_ORDER_STATUSES },
    };

    const [
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      totalOrders,
      deliveredOrders,
      returnedOrders,
      openOrders,
      revenue,
      expectedRevenue,
      recentOrders,
    ] = await this.prisma.$transaction([
      this.prisma.order.count({
        where: { ...baseWhere, createdAt: { gte: startOfToday } },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, createdAt: { gte: startOfWeek } },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, createdAt: { gte: startOfMonth } },
      }),
      this.prisma.order.count({ where: baseWhere }),
      this.prisma.order.count({
        where: { ...baseWhere, status: OrderStatus.DELIVERED },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, status: OrderStatus.RETURNED },
      }),
      this.prisma.order.count({
        where: { ...baseWhere, status: { in: OPEN_ORDER_STATUSES } },
      }),
      this.prisma.order.aggregate({
        where: revenueWhere,
        _sum: { total: true },
      }),
      this.prisma.order.aggregate({
        where: expectedRevenueWhere,
        _sum: { total: true },
      }),
      this.prisma.order.findMany({
        where: baseWhere,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
        take: 3,
      }),
    ]);

    return {
      ordersToday,
      ordersThisWeek,
      ordersThisMonth,
      totalOrders,
      deliveredOrders,
      returnedOrders,
      openOrders,
      revenue: this.money(Number(revenue._sum.total ?? 0)),
      expectedRevenue: this.money(Number(expectedRevenue._sum.total ?? 0)),
      totalRevenue: this.money(Number(revenue._sum.total ?? 0)),
      revenueStatuses: REVENUE_ORDER_STATUSES,
      expectedRevenueStatuses: EXPECTED_REVENUE_ORDER_STATUSES,
      openOrderStatuses: OPEN_ORDER_STATUSES,
      recentOrders: recentOrders.map((order) => this.toOrderResponse(order)),
    };
  }

  async updateVendorOrderStatus(
    currentUser: AuthTokenPayload,
    id: string,
    payload: unknown,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const order = await this.prisma.order.findFirst({
      where: { id, vendorId: vendor.id, vendorDeletedAt: null },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.updateOrderStatus(order, payload, {
      actorUserId: currentUser.sub,
      action: 'VENDOR_ORDER_STATUS_CHANGED',
    });
  }

  async updateVendorOrder(
    currentUser: AuthTokenPayload,
    id: string,
    payload: unknown,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const order = await this.prisma.order.findFirst({
      where: { id, vendorId: vendor.id, vendorDeletedAt: null },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const body = this.asVendorOrderUpdatePayload(payload);
    const data: Prisma.OrderUpdateInput = {};
    let nextStatus: OrderStatus | null = null;
    let statusChanged = false;

    if (body.fullName !== undefined) {
      data.shippingFullName = this.requiredString(body.fullName, 'fullName');
    }

    if (body.phone !== undefined) {
      data.shippingPhone = this.requiredString(body.phone, 'phone');
    }

    if (body.address !== undefined) {
      data.shippingAddressLine1 = this.requiredString(body.address, 'address');
    }

    if (body.city !== undefined) {
      data.shippingCity = this.requiredString(body.city, 'city');
    }

    if (body.governorate !== undefined) {
      const governorate = this.optionalString(body.governorate, 'governorate');
      data.shippingGovernorate = governorate ?? order.shippingGovernorate;
    }

    if (body.postalCode !== undefined) {
      data.shippingPostalCode = this.optionalString(body.postalCode, 'postalCode');
    }

    if (body.notes !== undefined) {
      data.notes = this.optionalString(body.notes, 'notes');
    }

    if (body.status !== undefined) {
      nextStatus = this.requiredOrderStatus(body.status);
      this.validateStatusTransition(order.status, nextStatus);
      statusChanged = order.status !== nextStatus;
      data.status = nextStatus;
    }

    if (Object.keys(data).length === 0) {
      return { order: this.toOrderResponse(order) };
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      let shouldRestoreStock = false;

      if (
        statusChanged &&
        nextStatus &&
        STOCK_RESTORE_ORDER_STATUSES.includes(nextStatus)
      ) {
        const restoreClaim = await tx.order.updateMany({
          where: { id: order.id, stockRestoredAt: null },
          data: {
            status: nextStatus,
            stockRestoredAt: new Date(),
          },
        });

        shouldRestoreStock = restoreClaim.count === 1;

        if (shouldRestoreStock) {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { increment: item.quantity },
              },
            });
          }
        }
      }

      const savedOrder = await tx.order.update({
        where: { id: order.id },
        data,
        include: this.orderInclude(),
      });

      if (statusChanged && nextStatus) {
        await tx.auditLog.create({
          data: {
            actorUserId: currentUser.sub,
            action: 'VENDOR_ORDER_STATUS_CHANGED',
            entityType: 'Order',
            entityId: order.id,
            metadata: {
              previousStatus: order.status,
              nextStatus,
              stockRestored: shouldRestoreStock,
            },
          },
        });
      }

      return savedOrder;
    });

    if (statusChanged && nextStatus) {
      this.scheduleOrderStatusNotification(updatedOrder, nextStatus);
    }

    return { order: this.toOrderResponse(updatedOrder) };
  }

  async softDeleteVendorOrder(
    currentUser: AuthTokenPayload,
    id: string,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser.sub);
    const order = await this.prisma.order.findFirst({
      where: { id, vendorId: vendor.id, vendorDeletedAt: null },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id: order.id },
      data: { vendorDeletedAt: new Date() },
      include: this.orderInclude(),
    });

    return { order: this.toOrderResponse(updatedOrder) };
  }

  async findAllAdmin(query: AdminOrderQuery = {}) {
    const selectedStatus = this.optionalOrderStatus(query.status);
    const pagination = this.parsePagination(query);
    const where: Prisma.OrderWhereInput | undefined = selectedStatus
      ? { status: selectedStatus }
      : undefined;
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
        include: this.orderInclude(),
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return this.paginated(
      orders.map((order) => this.toOrderResponse(order)),
      pagination,
      total,
    );
  }

  async updateAdminOrderStatus(
    id: string,
    payload: unknown,
    currentUser?: AuthTokenPayload,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return this.updateOrderStatus(order, payload, {
      actorUserId: currentUser?.sub,
      action: 'ADMIN_ORDER_STATUS_CHANGED',
    });
  }

  private scheduleOrderStatusNotification(
    order: OrderWithRelations,
    nextStatus: OrderStatus,
  ) {
    const isCancellation = nextStatus === OrderStatus.CANCELLED;
    const type = isCancellation
      ? NotificationType.ORDER_CANCELLED
      : NotificationType.ORDER_STATUS_CHANGED;
    const title = isCancellation ? 'Commande annulée' : 'Statut mis à jour';
    const body = isCancellation
      ? 'Votre commande a été annulée.'
      : `Votre commande est maintenant : ${nextStatus}.`;

    void this.notificationsService
      .create(order.buyerId, type, title, body, {
        orderId: order.id,
        previousStatus: order.status,
        nextStatus,
      })
      .catch((err) => console.error('[notify] order status:', err));

    void this.emailService
      .sendOrderStatusEmail(order.buyer.email, order.id, nextStatus)
      .catch((err) => console.error('[email] order status:', err));
  }

  private async updateOrderStatus(
    order: OrderWithRelations,
    payload: unknown,
    audit: { actorUserId?: string; action: string },
  ) {
    const body = this.asStatusPayload(payload);
    const nextStatus = this.requiredOrderStatus(body.status);

    this.validateStatusTransition(order.status, nextStatus);

    if (order.status === nextStatus) {
      return { order: this.toOrderResponse(order) };
    }

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      let shouldRestoreStock = false;

      if (STOCK_RESTORE_ORDER_STATUSES.includes(nextStatus)) {
        const restoreClaim = await tx.order.updateMany({
          where: { id: order.id, stockRestoredAt: null },
          data: {
            status: nextStatus,
            stockRestoredAt: new Date(),
          },
        });

        shouldRestoreStock = restoreClaim.count === 1;

        if (shouldRestoreStock) {
          for (const item of order.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: {
                stockQuantity: { increment: item.quantity },
              },
            });
          }
        } else {
          await tx.order.update({
            where: { id: order.id },
            data: { status: nextStatus },
          });
        }
      } else {
        await tx.order.update({
          where: { id: order.id },
          data: { status: nextStatus },
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: audit.actorUserId,
          action: audit.action,
          entityType: 'Order',
          entityId: order.id,
          metadata: {
            previousStatus: order.status,
            nextStatus,
            stockRestored: shouldRestoreStock,
          },
        },
      });

      return tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: this.orderInclude(),
      });
    });

    this.scheduleOrderStatusNotification(updatedOrder, nextStatus);

    return { order: this.toOrderResponse(updatedOrder) };
  }

  private parsePagination(query: { page?: unknown; limit?: unknown }) {
    const page = this.optionalPositiveInt(query.page, 'page') ?? DEFAULT_PAGE;
    const limit = this.optionalPositiveInt(query.limit, 'limit') ?? DEFAULT_LIMIT;

    if (limit > MAX_LIMIT) {
      throw new BadRequestException(`limit must be between 1 and ${MAX_LIMIT}`);
    }

    return { page, limit };
  }

  private paginated<T>(
    items: T[],
    pagination: { page: number; limit: number },
    total: number,
  ) {
    return {
      items,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / pagination.limit)),
      },
    };
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

    if (!item.product.category.isActive) {
      throw new BadRequestException(
        `${item.product.name} category is not available for ordering`,
      );
    }

    if (
      !item.product.vendor.isActive ||
      item.product.vendor.status !== VendorStatus.APPROVED ||
      !item.product.vendor.user.isActive
    ) {
      throw new BadRequestException(
        `${item.product.name} vendor is not available for ordering`,
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
      items: {
        include: {
          product: {
            include: {
              images: {
                orderBy: { sortOrder: 'asc' as const },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' as const },
      },
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
      vendorDeletedAt: order.vendorDeletedAt,
      buyer: toPublicUser(order.buyer),
      vendor: {
        id: order.vendor.id,
        storeName: order.vendor.storeName,
        slug: order.vendor.slug,
      },
      items: order.items.map((item) => {
        const productImage = item.product.images[0] ?? null;

        return {
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productSlug: item.productSlug,
          productImage: productImage
            ? {
                id: productImage.id,
                url: productImage.url,
                altText: productImage.altText,
                sortOrder: productImage.sortOrder,
                createdAt: productImage.createdAt,
              }
            : null,
          price: this.money(Number(item.unitPrice)),
          unitPrice: this.money(Number(item.unitPrice)),
          quantity: item.quantity,
          subtotal: this.money(Number(item.subtotal)),
        };
      }),
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

  private asVendorOrderUpdatePayload(payload: unknown): VendorOrderUpdatePayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as VendorOrderUpdatePayload;
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

  private optionalBoolean(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }

    return Boolean(value);
  }

  private optionalOrderStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.requiredOrderStatus(value);
  }

  private optionalPositiveInt(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be a positive integer`);
    }

    return parsed;
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

  private startOfDay(value: Date) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  private startOfWeek(value: Date) {
    const start = this.startOfDay(value);
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - daysSinceMonday);

    return start;
  }
}
