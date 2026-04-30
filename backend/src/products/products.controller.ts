import {
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

type UploadedImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query('category') categorySlug?: string) {
    return this.productsService.findAllPublic({ categorySlug });
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
  findMyProducts(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.productsService.findVendorProducts(currentUser);
  }

  @Post()
  createProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Body() body: unknown,
  ) {
    return this.productsService.createVendorProduct(currentUser, body ?? {});
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
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
