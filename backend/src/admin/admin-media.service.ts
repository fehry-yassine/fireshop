import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { basename, extname, join } from 'path';

export type UploadedAdminImageFile = {
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
export class AdminMediaService {
  async uploadHomepagePromoImage(file: UploadedAdminImageFile | undefined) {
    this.validateImageFile(file);

    const uploadDir = join(process.cwd(), 'uploads', 'admin-promos');
    await mkdir(uploadDir, { recursive: true });

    const filename = this.buildFilename(file);
    await writeFile(join(uploadDir, filename), file.buffer);

    return {
      url: `/api/uploads/admin-promos/${filename}`,
    };
  }

  private validateImageFile(
    file: UploadedAdminImageFile | undefined,
  ): asserts file is UploadedAdminImageFile {
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

  private buildFilename(file: UploadedAdminImageFile) {
    const extension = this.resolveImageFileExtension(file);
    return `homepage-promo-${Date.now()}-${randomUUID()}${extension}`;
  }

  private resolveImageFileExtension(file: UploadedAdminImageFile) {
    const originalExtension = extname(file.originalname ?? '').toLowerCase();
    const allowedExtensions =
      ALLOWED_IMAGE_EXTENSIONS_BY_MIME[file.mimetype] ?? ['.jpg'];

    if (allowedExtensions.includes(originalExtension)) {
      return originalExtension;
    }

    return allowedExtensions[0];
  }

  private validateOriginalFilename(file: UploadedAdminImageFile) {
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
}
