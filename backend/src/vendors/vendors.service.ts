import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role, User, Vendor, VendorStatus } from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/public-user';

type VendorPayload = {
  storeName?: unknown;
  slug?: unknown;
  description?: unknown;
  logoUrl?: unknown;
  status?: unknown;
  isActive?: unknown;
  adminNote?: unknown;
  note?: unknown;
  commissionRate?: unknown;
};

type VendorWithUser = Vendor & { user: User };

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(currentUser: AuthTokenPayload, payload: unknown) {
    const body = this.asPayload(payload);
    const user = await this.findActiveUser(currentUser.sub);

    if (user.role !== Role.BUYER) {
      throw new ForbiddenException('Only buyers can submit vendor applications');
    }

    const existingApplication = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    if (
      existingApplication &&
      (existingApplication.status === VendorStatus.PENDING ||
        existingApplication.status === VendorStatus.APPROVED)
    ) {
      throw new ConflictException('Vendor application already exists');
    }

    const data = this.applicationData(body);

    try {
      const application = existingApplication
        ? await this.prisma.vendor.update({
            where: { id: existingApplication.id },
            data: {
              ...data,
              status: VendorStatus.PENDING,
              isActive: false,
              adminNote: null,
            },
            include: { user: true },
          })
        : await this.prisma.vendor.create({
            data: {
              ...data,
              userId: user.id,
              status: VendorStatus.PENDING,
              isActive: false,
            },
            include: { user: true },
          });

      return { application: this.toApplication(application) };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findMyApplication(currentUser: AuthTokenPayload) {
    const user = await this.findActiveUser(currentUser.sub);
    const application = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      include: { user: true },
    });

    return {
      application: application ? this.toApplication(application) : null,
    };
  }

  async findMyVendor(currentUser: AuthTokenPayload) {
    const user = await this.findActiveUser(currentUser.sub);
    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
    });

    if (
      !vendor ||
      !vendor.isActive ||
      vendor.status !== VendorStatus.APPROVED
    ) {
      throw new NotFoundException('Active vendor profile not found');
    }

    return { vendor: this.toPublicVendor(vendor) };
  }

  async findAllPublic() {
    const vendors = await this.prisma.vendor.findMany({
      where: this.publicWhere(),
      orderBy: { createdAt: 'desc' },
    });

    return vendors.map((vendor) => this.toPublicVendor(vendor));
  }

  async findBySlugPublic(slug: string) {
    const vendor = await this.prisma.vendor.findUnique({ where: { slug } });

    if (
      !vendor ||
      !vendor.isActive ||
      vendor.status !== VendorStatus.APPROVED
    ) {
      throw new NotFoundException('Vendor not found');
    }

    return this.toPublicVendor(vendor);
  }

  async findApplicationsAdmin(status?: unknown) {
    const selectedStatus = this.optionalStatus(status);
    const vendors = await this.prisma.vendor.findMany({
      where: selectedStatus
        ? { status: selectedStatus }
        : { status: { in: [VendorStatus.PENDING, VendorStatus.REJECTED] } },
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return vendors.map((vendor) => this.toApplication(vendor));
  }

  async findAllAdmin(status?: unknown) {
    const selectedStatus = this.optionalStatus(status);
    const vendors = await this.prisma.vendor.findMany({
      where: selectedStatus ? { status: selectedStatus } : undefined,
      include: { user: true },
      orderBy: { createdAt: 'desc' },
    });

    return vendors.map((vendor) => this.toAdminVendor(vendor));
  }

  async approveApplicationAdmin(id: string, payload: unknown) {
    const body = this.asPayload(payload, true);
    const application = await this.findByIdAdminOrThrow(id);

    if (application.status !== VendorStatus.PENDING) {
      throw new ConflictException('Only pending applications can be approved');
    }

    if (!application.user.isActive) {
      throw new BadRequestException('Inactive users cannot become vendors');
    }

    const adminNote = this.optionalString(body.adminNote ?? body.note, 'adminNote');

    const vendor = await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: application.userId },
        data: { role: Role.VENDOR },
      });

      return tx.vendor.update({
        where: { id },
        data: {
          status: VendorStatus.APPROVED,
          isActive: true,
          adminNote,
        },
        include: { user: true },
      });
    });

    return { vendor: this.toAdminVendor(vendor) };
  }

  async rejectApplicationAdmin(id: string, payload: unknown) {
    const body = this.asPayload(payload);
    const application = await this.findByIdAdminOrThrow(id);

    if (application.status !== VendorStatus.PENDING) {
      throw new ConflictException('Only pending applications can be rejected');
    }

    const adminNote = this.requiredString(
      body.adminNote ?? body.note,
      'adminNote',
    );

    const vendor = await this.prisma.vendor.update({
      where: { id },
      data: {
        status: VendorStatus.REJECTED,
        isActive: false,
        adminNote,
      },
      include: { user: true },
    });

    return { application: this.toApplication(vendor) };
  }

  async updateAdmin(id: string, payload: unknown) {
    const body = this.asPayload(payload);
    const existing = await this.findByIdAdminOrThrow(id);
    const data: Prisma.VendorUpdateInput = {};

    if (body.storeName !== undefined) {
      data.storeName = this.requiredString(body.storeName, 'storeName');
    }

    if (body.slug !== undefined) {
      data.slug = this.normalizeSlug(body.slug);
    }

    if (body.description !== undefined) {
      data.description = this.optionalString(body.description, 'description');
    }

    if (body.logoUrl !== undefined) {
      data.logoUrl = this.optionalString(body.logoUrl, 'logoUrl');
    }

    if (body.adminNote !== undefined || body.note !== undefined) {
      data.adminNote = this.optionalString(body.adminNote ?? body.note, 'adminNote');
    }

    if (body.commissionRate !== undefined) {
      data.commissionRate = this.positiveNumber(
        body.commissionRate,
        'commissionRate',
      );
    }

    const nextStatus =
      body.status !== undefined
        ? this.requiredStatus(body.status)
        : existing.status;
    const statusChanged = nextStatus !== existing.status;

    if (body.status !== undefined) {
      data.status = nextStatus;
    }

    const nextIsActive =
      body.isActive !== undefined
        ? this.optionalBoolean(body.isActive, 'isActive')
        : statusChanged
          ? nextStatus === VendorStatus.APPROVED
          : existing.isActive;

    if (nextIsActive && nextStatus !== VendorStatus.APPROVED) {
      throw new BadRequestException('Only approved vendors can be active');
    }

    if (body.isActive !== undefined || statusChanged) {
      data.isActive = nextIsActive;
    }

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('At least one field is required');
    }

    try {
      const vendor = await this.prisma.$transaction(async (tx) => {
        if (nextStatus === VendorStatus.APPROVED && nextIsActive) {
          await tx.user.update({
            where: { id: existing.userId },
            data: { role: Role.VENDOR },
          });
        }

        return tx.vendor.update({
          where: { id },
          data,
          include: { user: true },
        });
      });

      return { vendor: this.toAdminVendor(vendor) };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private applicationData(payload: VendorPayload) {
    const storeName = this.requiredString(payload.storeName, 'storeName');

    return {
      storeName,
      slug: this.normalizeSlug(payload.slug, storeName),
      description: this.optionalString(payload.description, 'description'),
      logoUrl: this.optionalString(payload.logoUrl, 'logoUrl'),
    };
  }

  private publicWhere(): Prisma.VendorWhereInput {
    return {
      status: VendorStatus.APPROVED,
      isActive: true,
      user: { isActive: true },
    };
  }

  private async findActiveUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return user;
  }

  private async findByIdAdminOrThrow(id: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor application not found');
    }

    return vendor;
  }

  private asPayload(payload: unknown, allowEmpty = false): VendorPayload {
    if (!payload || typeof payload !== 'object') {
      if (allowEmpty) {
        return {};
      }

      throw new BadRequestException('Request body is required');
    }

    return payload as VendorPayload;
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

  private optionalStatus(value: unknown) {
    if (value === undefined || value === null || value === '') {
      return null;
    }

    return this.requiredStatus(value);
  }

  private requiredStatus(value: unknown) {
    if (
      typeof value !== 'string' ||
      !Object.values(VendorStatus).includes(value as VendorStatus)
    ) {
      throw new BadRequestException('status is invalid');
    }

    return value as VendorStatus;
  }

  private optionalBoolean(value: unknown, field: string) {
    if (typeof value !== 'boolean') {
      throw new BadRequestException(`${field} must be a boolean`);
    }

    return value;
  }

  private positiveNumber(value: unknown, field: string) {
    const parsed =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number(value)
          : Number.NaN;

    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException(`${field} must be positive`);
    }

    return parsed;
  }

  private toPublicVendor(vendor: Vendor) {
    return {
      id: vendor.id,
      storeName: vendor.storeName,
      slug: vendor.slug,
      description: vendor.description,
      logoUrl: vendor.logoUrl,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  private toApplication(vendor: VendorWithUser) {
    return {
      id: vendor.id,
      storeName: vendor.storeName,
      slug: vendor.slug,
      description: vendor.description,
      logoUrl: vendor.logoUrl,
      status: vendor.status,
      isActive: vendor.isActive,
      adminNote: vendor.adminNote,
      user: toPublicUser(vendor.user),
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }

  private toAdminVendor(vendor: VendorWithUser) {
    return {
      ...this.toApplication(vendor),
      commissionRate: vendor.commissionRate.toString(),
    };
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Vendor slug already exists');
    }

    throw error;
  }
}
