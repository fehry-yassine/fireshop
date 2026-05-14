import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { HomepagePromoType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type HomepagePromoPayload = {
  type?: unknown;
  title?: unknown;
  subtitle?: unknown;
  imageUrl?: unknown;
  linkUrl?: unknown;
  sortOrder?: unknown;
  isActive?: unknown;
};

@Injectable()
export class HomepagePromosService {
  constructor(private readonly prisma: PrismaService) {}

  async findPublic() {
    const promos = await this.prisma.homepagePromo.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return {
      promoCards: promos.filter(
        (promo) => promo.type === HomepagePromoType.PROMO_CARD,
      ),
      heroSlides: promos.filter(
        (promo) => promo.type === HomepagePromoType.HERO_SLIDE,
      ),
    };
  }

  findAllAdmin(query: { type?: unknown } = {}) {
    const type = this.optionalType(query.type);

    return this.prisma.homepagePromo.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createAdmin(payload: HomepagePromoPayload) {
    const type = this.requiredType(payload.type);
    const title = this.optionalTitle(payload.title);

    return this.prisma.homepagePromo.create({
      data: {
        type,
        title,
        subtitle: this.optionalString(payload.subtitle, 'subtitle'),
        imageUrl: this.optionalUrl(payload.imageUrl, 'imageUrl'),
        linkUrl: this.requiredUrl(payload.linkUrl, 'linkUrl'),
        sortOrder: this.optionalInteger(payload.sortOrder, 'sortOrder', 0),
        isActive: this.optionalBoolean(payload.isActive, true),
      },
    });
  }

  async updateAdmin(id: string, payload: HomepagePromoPayload) {
    await this.findPromoByIdOrThrow(id);
    const data: Prisma.HomepagePromoUpdateInput = {};

    if (payload.type !== undefined) {
      data.type = this.requiredType(payload.type);
    }

    if (payload.title !== undefined) {
      data.title = this.optionalTitle(payload.title);
    }

    if (payload.subtitle !== undefined) {
      data.subtitle = this.optionalString(payload.subtitle, 'subtitle');
    }

    if (payload.imageUrl !== undefined) {
      data.imageUrl = this.optionalUrl(payload.imageUrl, 'imageUrl');
    }

    if (payload.linkUrl !== undefined) {
      data.linkUrl = this.requiredUrl(payload.linkUrl, 'linkUrl');
    }

    if (payload.sortOrder !== undefined) {
      data.sortOrder = this.optionalInteger(payload.sortOrder, 'sortOrder', 0);
    }

    if (payload.isActive !== undefined) {
      data.isActive = this.optionalBoolean(payload.isActive, true);
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    return this.prisma.homepagePromo.update({
      where: { id },
      data,
    });
  }

  async softDeleteAdmin(id: string) {
    await this.findPromoByIdOrThrow(id);

    return this.prisma.homepagePromo.update({
      where: { id },
      data: { isActive: false },
    });
  }

  private async findPromoByIdOrThrow(id: string) {
    const promo = await this.prisma.homepagePromo.findUnique({
      where: { id },
    });

    if (!promo) {
      throw new NotFoundException('Homepage promo not found');
    }

    return promo;
  }

  private requiredType(value: unknown) {
    if (value === HomepagePromoType.PROMO_CARD) {
      return HomepagePromoType.PROMO_CARD;
    }

    if (value === HomepagePromoType.HERO_SLIDE) {
      return HomepagePromoType.HERO_SLIDE;
    }

    throw new BadRequestException('type must be PROMO_CARD or HERO_SLIDE');
  }

  private optionalType(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.requiredType(value);
  }

  private optionalTitle(value: unknown) {
    if (value === undefined || value === null) {
      return '';
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('title must be a string');
    }

    const trimmed = value.trim();
    if (trimmed.length > 160) {
      throw new BadRequestException('title is too long');
    }

    return trimmed;
  }

  private optionalString(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();

    if (trimmed.length > 240) {
      throw new BadRequestException(`${field} is too long`);
    }

    return trimmed.length > 0 ? trimmed : null;
  }

  private requiredUrl(value: unknown, field: string) {
    const url = this.optionalUrl(value, field);

    if (!url) {
      throw new BadRequestException(`${field} is required`);
    }

    return url;
  }

  private optionalUrl(value: unknown, field: string) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException(`${field} must be a string`);
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return null;
    }

    if (trimmed.length > 1200) {
      throw new BadRequestException(`${field} is too long`);
    }

    if (this.isSafeRelativeUrl(trimmed) || this.isHttpUrl(trimmed)) {
      return trimmed;
    }

    throw new BadRequestException(
      `${field} must be a relative path or HTTP(S) URL`,
    );
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

  private optionalInteger(value: unknown, field: string, fallback: number) {
    if (value === undefined || value === null || value === '') {
      return fallback;
    }

    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isInteger(parsed)) {
      throw new BadRequestException(`${field} must be an integer`);
    }

    return parsed;
  }

  private isSafeRelativeUrl(value: string) {
    return value.startsWith('/') && !value.startsWith('//');
  }

  private isHttpUrl(value: string) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
