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
  Product,
  ProductImage,
  ProductStatus,
  Role,
  User,
  Vendor,
  VendorStatus,
} from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

type AdminProductRejectPayload = {
  reason?: unknown;
};

type AdminProductFeaturePayload = {
  featured?: unknown;
};

type ProductWithRelations = Product & {
  category: Category;
  images: ProductImage[];
  vendor: Vendor & { user: User };
};

@Injectable()
export class ProductLifecycleService {
  constructor(private readonly prisma: PrismaService) {}

  async publishVendorProduct(currentUser: AuthTokenPayload, id: string) {
    const vendor = await this.findActiveVendorForUser(currentUser);
    const product = await this.findVendorProductWithRelationsOrThrow(vendor.id, id);

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException('Archived products cannot be published');
    }

    if (
      product.status !== ProductStatus.DRAFT &&
      product.status !== ProductStatus.REJECTED
    ) {
      throw new ConflictException('Only draft or rejected products can be published');
    }

    const validationErrors = this.validateProductForPublishing(product);
    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join('; '));
    }

    return this.prisma.product.update({
      where: { id: product.id },
      data: {
        isActive: true,
        status: ProductStatus.PENDING_REVIEW,
        rejectionReason: null,
      },
      include: this.productIncludes(),
    });
  }

  async approveProductAdmin(id: string, currentUser?: AuthTokenPayload) {
    const product = await this.findProductWithRelationsByIdOrThrow(id);

    if (
      product.status !== ProductStatus.PENDING_REVIEW
    ) {
      throw new ConflictException(
        'Only pending review products can be published',
      );
    }

    this.ensureProductCanBePublished(product);

    return this.prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          status: ProductStatus.PUBLISHED,
          isActive: true,
          rejectionReason: null,
        },
        include: this.productIncludes(),
      });

      await tx.auditLog.create({
        data: {
          actorUserId: currentUser?.sub,
          action: 'ADMIN_PRODUCT_APPROVED',
          entityType: 'Product',
          entityId: product.id,
          metadata: {
            previousStatus: product.status,
            nextStatus: ProductStatus.PUBLISHED,
          },
        },
      });

      return updatedProduct;
    });
  }

  async rejectProductAdmin(
    id: string,
    payload: unknown,
    currentUser?: AuthTokenPayload,
  ) {
    const product = await this.findProductByIdOrThrow(id);
    const body = this.asAdminRejectPayload(payload);
    const reason = this.requiredString(body.reason, 'reason');

    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException('Archived products cannot be rejected');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: { id: product.id },
        data: {
          status: ProductStatus.REJECTED,
          isActive: false,
          rejectionReason: reason,
        },
        include: this.productIncludes(),
      });

      await tx.auditLog.create({
        data: {
          actorUserId: currentUser?.sub,
          action: 'ADMIN_PRODUCT_REJECTED',
          entityType: 'Product',
          entityId: product.id,
          metadata: {
            previousStatus: product.status,
            nextStatus: ProductStatus.REJECTED,
            reason,
          },
        },
      });

      return updatedProduct;
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

  async featureProductAdmin(id: string, payload: unknown) {
    const product = await this.findProductByIdOrThrow(id);
    const body = this.asAdminFeaturePayload(payload);
    const featured = this.requiredBoolean(body.featured, 'featured');

    return this.prisma.product.update({
      where: { id: product.id },
      data: { isFeatured: featured },
      include: this.productIncludes(),
    });
  }

  private ensureProductCanBePublished(product: ProductWithRelations) {
    if (product.status === ProductStatus.ARCHIVED) {
      throw new ConflictException('Archived products cannot be published');
    }

    const validationErrors = this.validateProductForPublishing(product);

    if (validationErrors.length > 0) {
      throw new BadRequestException(validationErrors.join('; '));
    }
  }

  private validateProductForPublishing(product: ProductWithRelations) {
    const errors: string[] = [];

    if (!product.name.trim()) {
      errors.push('Product title is required');
    }

    if (!product.description || product.description.trim().length <= 50) {
      errors.push('Product description must be longer than 50 characters');
    }

    if (Number(product.price) <= 0) {
      errors.push('Product price must be greater than 0');
    }

    if (product.images.length === 0) {
      errors.push('At least one product image is required');
    }

    if (!product.category.isActive) {
      errors.push('Product category is inactive');
    }

    if (
      !product.vendor.isActive ||
      product.vendor.status !== VendorStatus.APPROVED ||
      !product.vendor.user.isActive
    ) {
      errors.push('Product vendor is not active and approved');
    }

    return errors;
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

  private async findVendorProductWithRelationsOrThrow(
    vendorId: string,
    id: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id, vendorId },
      include: this.productRelationsInclude(),
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

  private asAdminRejectPayload(payload: unknown): AdminProductRejectPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as AdminProductRejectPayload;
  }

  private asAdminFeaturePayload(payload: unknown): AdminProductFeaturePayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as AdminProductFeaturePayload;
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private requiredBoolean(value: unknown, field: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${field} must be a boolean`);
    }

    return value;
  }
}
