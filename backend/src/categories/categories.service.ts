import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type CategoryPayload = {
  name?: unknown;
  slug?: unknown;
  description?: unknown;
  parentId?: unknown;
  isActive?: unknown;
};

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  findAllPublic() {
    return this.prisma.category.findMany({
      where: {
        isActive: true,
        OR: [{ parentId: null }, { parent: { isActive: true } }],
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  findTreePublic() {
    return this.prisma.category.findMany({
      where: {
        parentId: null,
        isActive: true,
      },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.category.findMany({
      include: {
        parent: true,
        children: {
          orderBy: { name: 'asc' },
        },
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    });
  }

  findTreeAdmin() {
    return this.prisma.category.findMany({
      where: {
        parentId: null,
      },
      include: {
        children: {
          orderBy: { name: 'asc' },
          include: {
            _count: {
              select: {
                children: true,
                products: true,
              },
            },
          },
        },
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findBySlugPublic(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        parent: true,
        children: {
          where: { isActive: true },
          orderBy: { name: 'asc' },
        },
      },
    });

    if (!category || !category.isActive || category.parent?.isActive === false) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async createAdmin(payload: CategoryPayload) {
    const name = this.requiredString(payload.name, 'name');
    const slug = this.normalizeSlug(payload.slug, name);
    const parentId = this.normalizeParentId(payload.parentId);

    await this.validateParent(parentId);

    try {
      return await this.prisma.category.create({
        data: {
          name,
          slug,
          description: this.optionalString(payload.description),
          parentId,
          isActive: this.optionalBoolean(payload.isActive, true),
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async updateAdmin(id: string, payload: CategoryPayload) {
    const category = await this.findCategoryByIdOrThrow(id);
    const data: Prisma.CategoryUpdateInput = {};

    if (payload.name !== undefined) {
      data.name = this.requiredString(payload.name, 'name');
    }

    if (payload.slug !== undefined) {
      data.slug = this.normalizeSlug(payload.slug);
    }

    if (payload.description !== undefined) {
      data.description = this.optionalString(payload.description);
    }

    if (payload.isActive !== undefined) {
      data.isActive = this.optionalBoolean(payload.isActive, category.isActive);
    }

    if (payload.parentId !== undefined) {
      const parentId = this.normalizeParentId(payload.parentId);
      await this.validateParent(parentId, id);

      if (parentId !== null) {
        const childCount = await this.prisma.category.count({
          where: { parentId: id },
        });

        if (childCount > 0) {
          throw new BadRequestException(
            'A category with children cannot become a subcategory',
          );
        }
      }

      data.parent = parentId
        ? { connect: { id: parentId } }
        : { disconnect: true };
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    try {
      return await this.prisma.category.update({
        where: { id },
        data,
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async softDeleteAdmin(id: string) {
    await this.findCategoryByIdOrThrow(id);

    return this.prisma.category.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async findCategoryByIdOrThrow(id: string) {
    const category = await this.prisma.category.findUnique({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async validateParent(parentId: string | null, categoryId?: string) {
    if (parentId === null) {
      return;
    }

    if (parentId === categoryId) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    const parent = await this.prisma.category.findUnique({
      where: { id: parentId },
    });

    if (!parent) {
      throw new NotFoundException('Parent category not found');
    }

    if (parent.parentId !== null) {
      throw new BadRequestException(
        'A subcategory can only belong to a main category',
      );
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

  private optionalBoolean(value: unknown, fallback: boolean) {
    if (value === undefined || value === null) {
      return fallback;
    }

    if (typeof value !== 'boolean') {
      throw new BadRequestException('isActive must be a boolean');
    }

    return value;
  }

  private normalizeParentId(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('parentId must be a string');
    }

    return value;
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
      throw new ConflictException('Category slug already exists');
    }

    throw error;
  }
}
