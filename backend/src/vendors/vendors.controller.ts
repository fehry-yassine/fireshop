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
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from '../orders/orders.service';
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly ordersService: OrdersService,
  ) {}

  @Get()
  findAllPublic() {
    return this.vendorsService.findAllPublic();
  }

  @Get('my-application')
  @UseGuards(JwtAuthGuard)
  findMyApplication(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.vendorsService.findMyApplication(currentUser);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMyVendor(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.vendorsService.findMyVendor(currentUser);
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard)
  findVendorOrders(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Query('status') status?: string,
    @Query('deleted') deleted?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.ordersService.findVendorOrders(currentUser, {
      deleted,
      limit,
      page,
      search,
      status,
    });
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard)
  findVendorDashboard(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.ordersService.findVendorDashboard(currentUser);
  }

  @Patch('orders/:id/status')
  @UseGuards(JwtAuthGuard)
  updateVendorOrderStatus(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ordersService.updateVendorOrderStatus(
      currentUser,
      id,
      body ?? {},
    );
  }

  @Patch('orders/:id')
  @UseGuards(JwtAuthGuard)
  updateVendorOrder(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.ordersService.updateVendorOrder(currentUser, id, body ?? {});
  }

  @Delete('orders/:id')
  @UseGuards(JwtAuthGuard)
  softDeleteVendorOrder(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.ordersService.softDeleteVendorOrder(currentUser, id);
  }

  @Get(':slug')
  findBySlugPublic(@Param('slug') slug: string) {
    return this.vendorsService.findBySlugPublic(slug);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  apply(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Body() body: unknown,
  ) {
    return this.vendorsService.apply(currentUser, body ?? {});
  }
}
