import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, ProductStatus, Role, VendorStatus } from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

type ProductPayload = {
  vendorId?: unknown;
  categoryId?: unknown;
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  price?: unknown;
  offerPrice?: unknown;
  stockQuantity?: unknown;
  imageUrls?: unknown;
  images?: unknown;
  status?: unknown;
  isActive?: unknown;
  isFeatured?: unknown;
  isOnOffer?: unknown;
  rejectionReason?: unknown;
};

const VENDOR_RESTRICTED_FIELDS: Array<keyof ProductPayload> = [
  'vendorId',
  'offerPrice',
  'status',
  'isActive',
  'isFeatured',
  'isOnOffer',
  'rejectionReason',
];

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class ProductCrudService {
  constructor(private readonly prisma: PrismaService) {}

  async findVendorProducts(
    currentUser: AuthTokenPayload,
    query: { page?: unknown; limit?: unknown } = {},
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser);
    const pagination = this.parsePagination(query);
    const where: Prisma.ProductWhereInput = { vendorId: vendor.id };
    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        include: this.productIncludes(),
        orderBy: { createdAt: 'desc' },
        skip: (pagination.page - 1) * pagination.limit,
        take: pagination.limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return this.paginated(products, pagination, total);
  }

  async createVendorProduct(
    currentUser: AuthTokenPayload,
    payload: unknown,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser);
    const body = this.asPayload(payload);

    this.rejectVendorRestrictedFields(body);

    const categoryId = this.requiredString(body.categoryId, 'categoryId');
    const name = this.requiredString(body.name, 'name');
    const slug = this.normalizeSlug(body.slug, name);
    const imageUrls = this.optionalImageUrls(body.imageUrls ?? body.images);

    await this.validateCategory(categoryId);

    try {
      return await this.prisma.product.create({
        data: {
          vendor: { connect: { id: vendor.id } },
          category: { connect: { id: categoryId } },
          name,
          slug,
          description:
            this.optionalString(body.description, 'description') ??
            'No description provided.',
          price: this.positiveNumber(body.price, 'price'),
          stockQuantity: this.nonNegativeInteger(
            body.stockQuantity,
            'stockQuantity',
            0,
          ),
          status: ProductStatus.DRAFT,
          isActive: true,
          isFeatured: false,
          isOnOffer: false,
          ...(imageUrls.length > 0
            ? {
                images: {
                  create: imageUrls.map((url, index) => ({
                    url,
                    altText: name,
                    sortOrder: index,
                  })),
                },
              }
            : {}),
        },
        include: this.productIncludes(),
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateVendorProduct(
    currentUser: AuthTokenPayload,
    id: string,
    payload: unknown,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser);
    const body = this.asPayload(payload);
    const product = await this.findVendorProductOrThrow(vendor.id, id);

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException('Archived products cannot be updated');
    }

    this.rejectVendorRestrictedFields(body);

    const data: Prisma.ProductUpdateInput = {};
    const imageUrls =
      body.imageUrls !== undefined || body.images !== undefined
        ? this.optionalImageUrls(body.imageUrls ?? body.images)
        : undefined;
    const hasContentChanges =
      body.categoryId !== undefined ||
      body.name !== undefined ||
      body.slug !== undefined ||
      body.description !== undefined ||
      body.price !== undefined ||
      imageUrls !== undefined;

    if (body.categoryId !== undefined) {
      const categoryId = this.requiredString(body.categoryId, 'categoryId');
      await this.validateCategory(categoryId);
      data.category = { connect: { id: categoryId } };
    }

    if (body.name !== undefined) {
      data.name = this.requiredString(body.name, 'name');
    }

    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug);
    }

    if (body.description !== undefined) {
      data.description =
        this.optionalString(body.description, 'description') ??
        'No description provided.';
    }

    if (body.price !== undefined) {
      data.price = this.positiveNumber(body.price, 'price');
    }

    if (body.stockQuantity !== undefined) {
      data.stockQuantity = this.nonNegativeInteger(
        body.stockQuantity,
        'stockQuantity',
      );
    }

    if (imageUrls !== undefined) {
      data.images = {
        deleteMany: {},
        create: imageUrls.map((url, index) => ({
          url,
          altText:
            typeof data.name === 'string' ? data.name : product.name,
          sortOrder: index,
        })),
      };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    if (hasContentChanges) {
      data.status = ProductStatus.DRAFT;
      data.isActive = true;
      data.rejectionReason = null;
    }

    try {
      return await this.prisma.product.update({
        where: { id: product.id },
        data,
        include: this.productIncludes(),
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async archiveVendorProduct(currentUser: AuthTokenPayload, id: string) {
    const vendor = await this.findActiveVendorForUser(currentUser);
    const product = await this.findVendorProductOrThrow(vendor.id, id);

    return this.prisma.product.update({
      where: { id: product.id },
      data: {
        isActive: false,
        status: ProductStatus.ARCHIVED,
      },
      include: this.productIncludes(),
    });
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

  private productIncludes() {
    return {
      vendor: {
        select: {
          id: true,
          storeName: true,
          slug: true,
          description: true,
          logoUrl: true,
          status: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      category: true,
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
    };
  }

  private async findActiveVendorForUser(currentUser: AuthTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
      include: { vendor: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    if (user.role !== Role.VENDOR || !user.vendor) {
      throw new ForbiddenException('Vendor role is required');
    }

    if (
      !user.vendor.isActive ||
      user.vendor.status !== VendorStatus.APPROVED
    ) {
      throw new ForbiddenException('Active approved vendor profile is required');
    }

    return user.vendor;
  }

  private async findVendorProductOrThrow(vendorId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, vendorId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async validateCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found');
    }
  }

  private rejectVendorRestrictedFields(payload: ProductPayload) {
    const blockedFields = VENDOR_RESTRICTED_FIELDS.filter((field) =>
      Object.prototype.hasOwnProperty.call(payload, field),
    );

    if (blockedFields.length > 0) {
      throw new BadRequestException(
        `${blockedFields.join(', ')} cannot be managed by vendors`,
      );
    }
  }

  private optionalImageUrls(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return [];
    }

    const rawUrls = Array.isArray(value)
      ? value
      : typeof value === 'string'
        ? value.split(/[\n,]+/g)
        : null;

    if (!rawUrls) {
      throw new BadRequestException('imageUrls must be a list of URLs');
    }

    const urls = rawUrls
      .map((item) => {
        if (typeof item !== 'string') {
          throw new BadRequestException('imageUrls must contain strings');
        }

        return item.trim();
      })
      .filter((item) => item.length > 0);

    if (urls.length > 6) {
      throw new BadRequestException('imageUrls supports up to 6 images');
    }

    for (const url of urls) {
      if (this.isBase64ImageUrl(url)) {
        if (url.length > 7_000_000) {
          throw new BadRequestException(
            'Base64 image is too large. Use images smaller than about 5MB.',
          );
        }
        continue;
      }

      if (this.isUploadedProductImageUrl(url)) {
        continue;
      }

      try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
          throw new Error('Invalid protocol');
        }
      } catch {
        throw new BadRequestException(
          'imageUrls must contain valid HTTP URLs or base64 image data URLs',
        );
      }
    }

    return urls;
  }

  private isBase64ImageUrl(value: string) {
    return /^data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(
      value,
    );
  }

  private isUploadedProductImageUrl(value: string) {
    return /^\/api\/uploads\/product-images\/[a-z0-9._-]+\.(?:png|jpe?g|webp|gif)$/i.test(
      value,
    );
  }

  private asPayload(payload: unknown): ProductPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as ProductPayload;
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

  private positiveNumber(value: unknown, field: string) {
    const parsed = this.parseNumber(value, field);

    if (parsed <= 0) {
      throw new BadRequestException(`${field} must be positive`);
    }

    return parsed;
  }

  private nonNegativeInteger(value: unknown, field: string, fallback?: number) {
    if (value === undefined || value === null || value === '') {
      if (fallback !== undefined) {
        return fallback;
      }

      throw new BadRequestException(`${field} is required`);
    }

    const parsed = this.parseNumber(value, field);

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`${field} must be zero or positive`);
    }

    return parsed;
  }

  private parseNumber(value: unknown, field: string) {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(parsed)) {
      throw new BadRequestException(`${field} must be a number`);
    }

    return parsed;
  }

  private normalizeSlug(value: unknown, fallbackName?: string) {
    const rawValue = value === undefined || value === null ? fallbackName : value;

    if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
      throw new BadRequestException('slug is required');
    }

    const slug = rawValue
      .trim()
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (slug.length === 0) {
      throw new BadRequestException('slug is invalid');
    }

    return slug;
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

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Product slug already exists');
    }

    throw error;
  }
}
