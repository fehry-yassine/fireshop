import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
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

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly ordersService: OrdersService,
    private readonly productsService: ProductsService,
    private readonly vendorsService: VendorsService,
  ) {}

  @Post('categories')
  createCategory(@Body() body: unknown) {
    return this.categoriesService.createAdmin(body ?? {});
  }

  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() body: unknown) {
    return this.categoriesService.updateAdmin(id, body ?? {});
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
