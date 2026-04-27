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
import { VendorsService } from '../vendors/vendors.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly categoriesService: CategoriesService,
    private readonly ordersService: OrdersService,
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

  @Get('orders')
  findOrders(@Query('status') status?: string) {
    return this.ordersService.findAllAdmin(status);
  }

  @Patch('orders/:id/status')
  updateOrderStatus(@Param('id') id: string, @Body() body: unknown) {
    return this.ordersService.updateAdminOrderStatus(id, body ?? {});
  }
}
