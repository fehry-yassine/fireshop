import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  Category,
  Prisma,
  Product,
  ProductStatus,
  Role,
  User,
  Vendor,
  VendorStatus,
} from '@prisma/client';
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
  status?: unknown;
  isActive?: unknown;
  isFeatured?: unknown;
  isOnOffer?: unknown;
};

type PublicProductFilter = {
  categorySlug?: string;
};

type ProductWithRelations = Product & {
  category: Category;
  vendor: Vendor & { user: User };
};

const VENDOR_RESTRICTED_FIELDS: Array<keyof ProductPayload> = [
  'vendorId',
  'offerPrice',
  'status',
  'isActive',
  'isFeatured',
  'isOnOffer',
];

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
    const product = await this.prisma.product.findFirst({
      where: {
        slug,
        ...this.publicWhere({}),
      },
      include: this.productIncludes(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async findVendorProducts(currentUser: AuthTokenPayload) {
    const vendor = await this.findActiveVendorForUser(currentUser);

    return this.prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: this.productIncludes(),
      orderBy: { createdAt: 'desc' },
    });
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

    await this.validateCategory(categoryId);

    try {
      return await this.prisma.product.create({
        data: {
          vendorId: vendor.id,
          categoryId,
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
          status: ProductStatus.PENDING_APPROVAL,
          isActive: true,
          isFeatured: false,
          isOnOffer: false,
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
    let hasContentChange = false;

    if (body.categoryId !== undefined) {
      const categoryId = this.requiredString(body.categoryId, 'categoryId');
      await this.validateCategory(categoryId);
      data.category = { connect: { id: categoryId } };
      hasContentChange = true;
    }

    if (body.name !== undefined) {
      data.name = this.requiredString(body.name, 'name');
      hasContentChange = true;
    }

    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug);
      hasContentChange = true;
    }

    if (body.description !== undefined) {
      data.description =
        this.optionalString(body.description, 'description') ??
        'No description provided.';
      hasContentChange = true;
    }

    if (body.price !== undefined) {
      data.price = this.positiveNumber(body.price, 'price');
      hasContentChange = true;
    }

    if (body.stockQuantity !== undefined) {
      data.stockQuantity = this.nonNegativeInteger(
        body.stockQuantity,
        'stockQuantity',
      );
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    if (hasContentChange) {
      data.status = ProductStatus.PENDING_APPROVAL;
      data.isActive = true;
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

  async findPendingAdmin() {
    return this.prisma.product.findMany({
      where: { status: ProductStatus.PENDING_APPROVAL },
      include: this.productIncludes(),
      orderBy: { createdAt: 'desc' },
    });
  }

  async approveProductAdmin(id: string) {
    const product = await this.findProductWithRelationsByIdOrThrow(id);

    this.ensureProductCanBePublished(product);

    return this.prisma.product.update({
      where: { id: product.id },
      data: {
        status: ProductStatus.PUBLISHED,
        isActive: true,
      },
      include: this.productIncludes(),
    });
  }

  async rejectProductAdmin(id: string) {
    const product = await this.findProductByIdOrThrow(id);

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException('Archived products cannot be rejected');
    }

    return this.prisma.product.update({
      where: { id: product.id },
      data: { status: ProductStatus.REJECTED },
      include: this.productIncludes(),
    });
  }

  async archiveProductAdmin(id: string) {
    const product = await this.findProductByIdOrThrow(id);

    return this.prisma.product.update({
      where: { id: product.id },
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
      category: {
        isActive: true,
        ...(filter.categorySlug ? { slug: filter.categorySlug } : {}),
      },
      vendor: this.publicVendorWhere(),
    };
  }

  private publicVendorWhere(): Prisma.VendorWhereInput {
    return {
      isActive: true,
      status: VendorStatus.APPROVED,
      user: { isActive: true },
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

  private productRelationsInclude() {
    return {
      vendor: { include: { user: true } },
      category: true,
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

  private async findProductByIdOrThrow(id: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private async findProductWithRelationsByIdOrThrow(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productRelationsInclude(),
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  private ensureProductCanBePublished(product: ProductWithRelations) {
    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException('Archived products cannot be approved');
    }

    if (!product.category.isActive) {
      throw new BadRequestException('Product category is inactive');
    }

    if (
      !product.vendor.isActive ||
      product.vendor.status !== VendorStatus.APPROVED ||
      !product.vendor.user.isActive
    ) {
      throw new BadRequestException('Product vendor is not active and approved');
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
