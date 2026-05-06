import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Role, VendorStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';

export type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_EXTENSIONS_BY_MIME: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'image/gif': ['.gif'],
};

@Injectable()
export class ProductMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async uploadVendorProductImage(
    currentUser: AuthTokenPayload,
    file: UploadedImageFile | undefined,
  ) {
    const vendor = await this.findActiveVendorForUser(currentUser);
    this.validateImageFile(file);

    const uploadDir = this.productImageUploadDir();
    await mkdir(uploadDir, { recursive: true });

    const filename = this.buildProductImageFilename(vendor.id, file);
    const absolutePath = join(uploadDir, filename);

    await writeFile(absolutePath, file.buffer);

    return {
      url: `/api/uploads/product-images/${filename}`,
    };
  }

  private validateImageFile(
    file: UploadedImageFile | undefined,
  ): asserts file is UploadedImageFile {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }

    if (!ALLOWED_IMAGE_EXTENSIONS_BY_MIME[file.mimetype]) {
      throw new BadRequestException(
        'Only JPEG, PNG, WebP, and GIF image files are allowed',
      );
    }

    if (!file.buffer || file.size <= 0) {
      throw new BadRequestException('Image upload failed');
    }

    if (file.size > MAX_IMAGE_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        'Image is too large. Please upload a smaller image.',
      );
    }

    this.validateOriginalFilename(file);
  }

  private productImageUploadDir() {
    return join(process.cwd(), 'uploads', 'product-images');
  }

  private buildProductImageFilename(
    vendorId: string,
    file: UploadedImageFile,
  ) {
    const extension = this.resolveImageFileExtension(file);
    return `${vendorId}-${Date.now()}-${randomUUID()}${extension}`;
  }

  private resolveImageFileExtension(file: UploadedImageFile) {
    const originalExtension = extname(file.originalname ?? '').toLowerCase();
    const allowedExtensions =
      ALLOWED_IMAGE_EXTENSIONS_BY_MIME[file.mimetype] ?? ['.jpg'];

    if (allowedExtensions.includes(originalExtension)) {
      return originalExtension;
    }

    return allowedExtensions[0];
  }

  private validateOriginalFilename(file: UploadedImageFile) {
    const originalName = file.originalname?.trim();

    if (!originalName) {
      throw new BadRequestException('Image filename is required');
    }

    if (originalName.length > 180) {
      throw new BadRequestException('Image filename is too long');
    }

    if (
      originalName !== basename(originalName) ||
      originalName.includes('..') ||
      /[\\/<>:"|?*\u0000-\u001f]/u.test(originalName)
    ) {
      throw new BadRequestException('Image filename is not allowed');
    }

    const originalExtension = extname(originalName).toLowerCase();
    const allowedExtensions = ALLOWED_IMAGE_EXTENSIONS_BY_MIME[file.mimetype];

    if (!allowedExtensions?.includes(originalExtension)) {
      throw new BadRequestException(
        'Image filename extension does not match the uploaded image type',
      );
    }
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
}
