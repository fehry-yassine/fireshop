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
  approveVendorApplication(@Param('id') id: string, @Body() body: unknown) {
    return this.vendorsService.approveApplicationAdmin(id, body ?? {});
  }

  @Patch('vendors/applications/:id/reject')
  rejectVendorApplication(@Param('id') id: string, @Body() body: unknown) {
    return this.vendorsService.rejectApplicationAdmin(id, body ?? {});
  }

  @Get('vendors')
  findVendors(@Query('status') status?: string) {
    return this.vendorsService.findAllAdmin(status);
  }

  @Patch('vendors/:id')
  updateVendor(@Param('id') id: string, @Body() body: unknown) {
    return this.vendorsService.updateAdmin(id, body ?? {});
  }

  @Get('products/pending')
  findPendingProducts() {
    return this.productsService.findPendingAdmin();
  }

  @Patch('products/:id/approve')
  approveProduct(@Param('id') id: string) {
    return this.productsService.approveProductAdmin(id);
  }

  @Patch('products/:id/reject')
  rejectProduct(@Param('id') id: string) {
    return this.productsService.rejectProductAdmin(id);
  }

  @Patch('products/:id/archive')
  archiveProduct(@Param('id') id: string) {
    return this.productsService.archiveProductAdmin(id);
  }

  @Get('orders')
  findOrders(@Query('status') status?: string) {
    return this.ordersService.findAllAdmin(status);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.ordersService.updateAdminOrderStatus(id, body ?? {});
  }
}
