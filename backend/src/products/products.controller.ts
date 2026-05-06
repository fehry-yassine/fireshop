import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from '@prisma/client';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ProductsService } from './products.service';
import { Throttle } from '@nestjs/throttler';

type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function imageUploadFileFilter(
  _request: unknown,
  file: { mimetype?: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype || !ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
    callback(
      new BadRequestException(
        'Only JPEG, PNG, WebP, and GIF image files are allowed',
      ),
      false,
    );
    return;
  }

  callback(null, true);
}

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(
    @Query('category') categorySlug?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllPublic({ categorySlug, page, limit });
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlugPublic(slug);
  }

  @Post('recommend')
  recommend(@Body() body: unknown) {
    return this.productsService.recommendProducts(body ?? {});
  }

  @Post('recommend/feedback')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  feedback(@Body() body: unknown) {
    return this.productsService.recordRecommendationFeedback(body ?? {});
  }
}

@Controller('vendor/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.VENDOR)
export class VendorProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findMyProducts(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findVendorProducts(currentUser, { page, limit });
  }

  @Post()
  createProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Body() body: unknown,
  ) {
    return this.productsService.createVendorProduct(currentUser, body ?? {});
  }

  @Post('upload-image')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseInterceptors(
    FileInterceptor('file', {
      fileFilter: imageUploadFileFilter,
      limits: {
        fileSize: MAX_IMAGE_UPLOAD_SIZE_BYTES,
        files: 1,
      },
    }),
  )
  uploadProductImage(
    @CurrentUser() currentUser: AuthTokenPayload,
    @UploadedFile() file: UploadedImageFile,
  ) {
    return this.productsService.uploadVendorProductImage(currentUser, file);
  }

  @Patch(':id/publish')
  publishProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.productsService.publishVendorProduct(currentUser, id);
  }

  @Patch(':id')
  updateProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.productsService.updateVendorProduct(currentUser, id, body ?? {});
  }

  @Patch(':id/archive')
  archiveProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.productsService.archiveVendorProduct(currentUser, id);
  }
}
