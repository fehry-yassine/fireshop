import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  CartItem,
  Category,
  Prisma,
  Product,
  ProductImage,
  ProductStatus,
  User,
  Vendor,
  VendorStatus,
} from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

type CartPayload = {
  productId?: unknown;
  quantity?: unknown;
};

type CartItemWithProduct = CartItem & {
  product: Product & {
    category: Category;
    images: ProductImage[];
    vendor: Vendor & { user: User };
  };
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getCart(currentUser: AuthTokenPayload) {
    const userId = await this.getActiveUserId(currentUser);
    return this.buildCartResponse(userId);
  }

  async addItem(currentUser: AuthTokenPayload, payload: unknown) {
    const userId = await this.getActiveUserId(currentUser);
    const body = this.asPayload(payload);
    const productId = this.requiredString(body.productId, 'productId');
    const quantity = this.positiveInteger(body.quantity, 'quantity');
    const product = await this.findAvailableProduct(productId);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
      include: this.cartItemInclude(),
    });

    if (existingItem) {
      const nextQuantity = existingItem.quantity + quantity;
      this.ensureStockAvailable(product, nextQuantity);

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: nextQuantity },
      });

      return this.buildCartResponse(userId);
    }

    await this.ensureSingleVendorCart(userId, product.vendorId);
    this.ensureStockAvailable(product, quantity);

    try {
      await this.prisma.cartItem.create({
        data: {
          userId,
          productId,
          quantity,
        },
      });

      return this.buildCartResponse(userId);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateItem(
    currentUser: AuthTokenPayload,
    itemId: string,
    payload: unknown,
  ) {
    const userId = await this.getActiveUserId(currentUser);
    const body = this.asPayload(payload);
    const quantity = this.positiveInteger(body.quantity, 'quantity');
    const item = await this.findCartItemOrThrow(userId, itemId);
    const product = this.ensureProductAvailable(item.product);

    this.ensureStockAvailable(product, quantity);

    await this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    return this.buildCartResponse(userId);
  }

  async removeItem(currentUser: AuthTokenPayload, itemId: string) {
    const userId = await this.getActiveUserId(currentUser);
    await this.findCartItemOrThrow(userId, itemId);
    await this.prisma.cartItem.delete({ where: { id: itemId } });

    return this.buildCartResponse(userId);
  }

  async clearCart(currentUser: AuthTokenPayload) {
    const userId = await this.getActiveUserId(currentUser);
    await this.prisma.cartItem.deleteMany({ where: { userId } });

    return this.buildCartResponse(userId);
  }

  private async buildCartResponse(userId: string) {
    const cartItems = await this.prisma.cartItem.findMany({
      where: { userId },
      include: this.cartItemInclude(),
      orderBy: { createdAt: 'asc' },
    });
    const items = cartItems.map((item) => this.toCartItemResponse(item));
    const total = this.money(
      items.reduce((sum, item) => sum + item.subtotal, 0),
    );

    return {
      items,
      vendor: items[0]?.vendor ?? null,
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total,
    };
  }

  private async getActiveUserId(currentUser: AuthTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return user.id;
  }

  private async findAvailableProduct(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { sortOrder: 'asc' } },
        vendor: { include: { user: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.ensureProductAvailable(product);
  }

  private ensureProductAvailable(
    product: Product & {
      category: Category;
      images: ProductImage[];
      vendor: Vendor & { user: User };
    },
  ) {
    if (!product.isActive || product.status !== ProductStatus.PUBLISHED) {
      throw new BadRequestException('Product is not available for cart');
    }

    if (!product.category.isActive) {
      throw new BadRequestException('Product category is not available');
    }

    if (
      !product.vendor.isActive ||
      product.vendor.status !== VendorStatus.APPROVED ||
      !product.vendor.user.isActive
    ) {
      throw new BadRequestException('Product vendor is not available');
    }

    return product;
  }

  private async findCartItemOrThrow(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: this.cartItemInclude(),
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    return item;
  }

  private async ensureSingleVendorCart(userId: string, vendorId: string) {
    const existingItem = await this.prisma.cartItem.findFirst({
      where: { userId },
      include: {
        product: {
          select: { vendorId: true },
        },
      },
    });

    if (existingItem && existingItem.product.vendorId !== vendorId) {
      throw new ConflictException(
        'Single-vendor checkout only. Please order from one vendor at a time.',
      );
    }
  }

  private ensureStockAvailable(product: Product, quantity: number) {
    if (quantity > product.stockQuantity) {
      throw new BadRequestException('Quantity exceeds product stock');
    }
  }

  private cartItemInclude() {
    return {
      product: {
        include: {
          category: true,
          images: { orderBy: { sortOrder: 'asc' as const } },
          vendor: { include: { user: true } },
        },
      },
    };
  }

  private toCartItemResponse(item: CartItemWithProduct) {
    const product = item.product;
    const unitPrice = this.money(Number(product.offerPrice ?? product.price));
    const subtotal = this.money(unitPrice * item.quantity);

    return {
      id: item.id,
      productId: product.id,
      quantity: item.quantity,
      unitPrice,
      subtotal,
      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,
        description: product.description,
        price: this.money(Number(product.price)),
        offerPrice:
          product.offerPrice === null
            ? null
            : this.money(Number(product.offerPrice)),
        stockQuantity: product.stockQuantity,
        images: product.images.map((image) => ({
          id: image.id,
          url: image.url,
          altText: image.altText,
          sortOrder: image.sortOrder,
        })),
      },
      vendor: {
        id: product.vendor.id,
        storeName: product.vendor.storeName,
        slug: product.vendor.slug,
      },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private asPayload(payload: unknown): CartPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as CartPayload;
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private positiveInteger(value: unknown, field: string) {
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

  private money(value: number) {
    return Number(value.toFixed(2));
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Product is already in cart');
    }

    throw error;
  }
}
