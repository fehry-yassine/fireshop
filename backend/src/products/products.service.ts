import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductStatus } from '@prisma/client';
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
  status?: unknown;
  isActive?: unknown;
  isFeatured?: unknown;
  isOnOffer?: unknown;
};

type PublicProductFilter = {
  categorySlug?: string;
};

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  findAllPublic(filter: PublicProductFilter = {}) {
    return this.prisma.product.findMany({
      where: this.publicWhere(filter),
      include: this.productIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  findByCategorySlugPublic(categorySlug: string) {
    return this.findAllPublic({ categorySlug });
  }

  async findBySlugPublic(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: this.productIncludes(),
    });

    if (
      !product ||
      !product.isActive ||
      product.status !== ProductStatus.PUBLISHED
    ) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async createManage(payload: ProductPayload) {
    const vendorId = this.requiredString(payload.vendorId, 'vendorId');
    const categoryId = this.requiredString(payload.categoryId, 'categoryId');
    const name = this.requiredString(payload.name, 'name');
    const slug = this.normalizeSlug(payload.slug, name);
    const description =
      this.optionalString(payload.description) ?? 'No description provided.';
    const price = this.positiveNumber(payload.price, 'price');
    const offerPrice = this.optionalPositiveNumber(
      payload.offerPrice,
      'offerPrice',
    );
    const stockQuantity = this.nonNegativeInteger(
      payload.stockQuantity,
      'stockQuantity',
      0,
    );

    await this.validateVendor(vendorId);
    await this.validateCategory(categoryId);

    try {
      return await this.prisma.product.create({
        data: {
          vendorId,
          categoryId,
          name,
          slug,
          description,
          price,
          offerPrice,
          stockQuantity,
          status: this.optionalStatus(payload.status, ProductStatus.DRAFT),
          isActive: this.optionalBoolean(payload.isActive, true, 'isActive'),
          isFeatured: this.optionalBoolean(
            payload.isFeatured,
            false,
            'isFeatured',
          ),
          isOnOffer: this.optionalBoolean(payload.isOnOffer, false, 'isOnOffer'),
        },
        include: this.productIncludes(),
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateManage(id: string, payload: ProductPayload) {
    await this.findProductByIdOrThrow(id);
    const data: Prisma.ProductUpdateInput = {};

    if (payload.vendorId !== undefined) {
      const vendorId = this.requiredString(payload.vendorId, 'vendorId');
      await this.validateVendor(vendorId);
      data.vendor = { connect: { id: vendorId } };
    }

    if (payload.categoryId !== undefined) {
      const categoryId = this.requiredString(payload.categoryId, 'categoryId');
      await this.validateCategory(categoryId);
      data.category = { connect: { id: categoryId } };
    }

    if (payload.name !== undefined) {
      data.name = this.requiredString(payload.name, 'name');
    }

    if (payload.slug !== undefined) {
      data.slug = this.normalizeSlug(payload.slug);
    }

    if (payload.description !== undefined) {
      data.description =
        this.optionalString(payload.description) ?? 'No description provided.';
    }

    if (payload.price !== undefined) {
      data.price = this.positiveNumber(payload.price, 'price');
    }

    if (payload.offerPrice !== undefined) {
      data.offerPrice = this.optionalPositiveNumber(
        payload.offerPrice,
        'offerPrice',
      );
    }

    if (payload.stockQuantity !== undefined) {
      data.stockQuantity = this.nonNegativeInteger(
        payload.stockQuantity,
        'stockQuantity',
      );
    }

    if (payload.status !== undefined) {
      data.status = this.optionalStatus(payload.status, ProductStatus.DRAFT);
    }

    if (payload.isActive !== undefined) {
      data.isActive = this.optionalBoolean(payload.isActive, true, 'isActive');
    }

    if (payload.isFeatured !== undefined) {
      data.isFeatured = this.optionalBoolean(
        payload.isFeatured,
        false,
        'isFeatured',
      );
    }

    if (payload.isOnOffer !== undefined) {
      data.isOnOffer = this.optionalBoolean(payload.isOnOffer, false, 'isOnOffer');
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    try {
      return await this.prisma.product.update({
        where: { id },
        data,
        include: this.productIncludes(),
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async softArchiveManage(id: string) {
    await this.findProductByIdOrThrow(id);

    return this.prisma.product.update({
      where: { id },
      data: {
        isActive: false,
        status: ProductStatus.ARCHIVED,
      },
      include: this.productIncludes(),
    });
  }

  private publicWhere(filter: PublicProductFilter): Prisma.ProductWhereInput {
    return {
      isActive: true,
      status: ProductStatus.PUBLISHED,
      ...(filter.categorySlug
        ? { category: { slug: filter.categorySlug, isActive: true } }
        : {}),
    };
  }

  private productIncludes() {
    return {
      vendor: true,
      category: true,
      images: {
        orderBy: { sortOrder: 'asc' as const },
      },
    };
  }

  private async findProductByIdOrThrow(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async validateVendor(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
  }

  private async validateCategory(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category || !category.isActive) {
      throw new NotFoundException('Category not found');
    }
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private optionalString(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('description must be a string');
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

  private optionalPositiveNumber(value: unknown, field: string) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.positiveNumber(value, field);
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

  private optionalBoolean(value: unknown, fallback: boolean, field: string) {
    if (value === undefined || value === null) {
      return fallback;
    }

    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${field} must be a boolean`);
    }

    return value;
  }

  private optionalStatus(value: unknown, fallback: ProductStatus) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    if (
      typeof value !== 'string' ||
      !Object.values(ProductStatus).includes(value as ProductStatus)
    ) {
      throw new BadRequestException('status is invalid');
    }

    return value as ProductStatus;
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
