import {
  BadRequestException,
  Body,
  Controller,
  Delete,
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
import { CategoriesService } from '../categories/categories.service';
import { OrdersService } from '../orders/orders.service';
import { ProductsService } from '../products/products.service';
import { VendorsService } from '../vendors/vendors.service';
import {
  AdminMediaService,
  UploadedAdminImageFile,
} from './admin-media.service';

const MAX_ADMIN_IMAGE_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_ADMIN_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

function adminImageUploadFileFilter(
  _request: unknown,
  file: { mimetype?: string },
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!file.mimetype || !ALLOWED_ADMIN_IMAGE_MIME_TYPES.has(file.mimetype)) {
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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminMediaService: AdminMediaService,
    private readonly categoriesService: CategoriesService,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Get('categories')
  findCategories() {
    return this.categoriesService.findAllAdmin();
  }

  @Get('categories/tree')
  findCategoryTree() {
    return this.categoriesService.findTreeAdmin();
  }

  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.categoriesService.createAdmin(body ?? {});
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: unknown) {
    return this.categoriesService.updateAdmin(id, body ?? {});
  }

  @Post('uploads/image')
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: adminImageUploadFileFilter,
      limits: {
        fileSize: MAX_ADMIN_IMAGE_UPLOAD_SIZE_BYTES,
        files: 1,
      },
    }),
  )
  uploadImage(@UploadedFile() file: UploadedAdminImageFile) {
    return this.adminMediaService.uploadHomepagePromoImage(file);
  }

  @Delete('categories/:id/permanent')
  deleteCategoryPermanently(@Param('id') id: string) {
    return this.categoriesService.deletePermanentAdmin(id);
  }

  @Delete('categories/:id')
  deleteCategory(@Param('id') id: string) {
    return this.categoriesService.softDeleteAdmin(id);
  }

  @Get('vendors/applications')
  findVendorApplications(@Query('status') status?: string) {
    return this.vendorsService.findApplicationsAdmin(status);
  }

  @Patch('vendors/applications/:id/approve')
  approveVendorApplication(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.vendorsService.approveApplicationAdmin(id, body ?? {}, currentUser);
  }

  @Patch('vendors/applications/:id/reject')
  rejectVendorApplication(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.vendorsService.rejectApplicationAdmin(id, body ?? {}, currentUser);
  }

  @Get('vendors')
  findVendors(@Query('status') status?: string) {
    return this.vendorsService.findAllAdmin(status);
  }

  @Patch('vendors/:id')
  updateVendor(@Param('id') id: string, @Body() body: unknown) {
    return this.vendorsService.updateAdmin(id, body ?? {});
  }

  @Get('products')
  findProducts(
    @Query('status') status?: string,
    @Query('vendorId') vendorId?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.productsService.findAllAdmin({
      status,
      vendorId,
      search,
      category,
      page,
      limit,
    });
  }

  @Get('products/pending')
  findPendingProducts() {
    return this.productsService.findPendingAdmin();
  }

  @Get('products/:id')
  findProductById(@Param('id') id: string) {
    return this.productsService.findByIdAdmin(id);
  }

  @Patch('products/:id/approve')
  approveProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.productsService.approveProductAdmin(id, currentUser);
  }

  @Patch('products/:id/reject')
  rejectProduct(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.productsService.rejectProductAdmin(id, body ?? {}, currentUser);
  }

  @Patch('products/:id/archive')
  archiveProduct(@Param('id') id: string) {
    return this.productsService.archiveProductAdmin(id);
  }

  @Patch('products/:id/feature')
  featureProduct(@Param('id') id: string, @Body() body: unknown) {
    return this.productsService.featureProductAdmin(id, body ?? {});
  }

  @Get('orders')
  findOrders(
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findAllAdmin({ status, page, limit });
  }

  @Patch('orders/:id/status')
  updateOrderStatus(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ordersService.updateAdminOrderStatus(id, body ?? {}, currentUser);
  }
}
