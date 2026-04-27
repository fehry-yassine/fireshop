import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
  findVendorOrders(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.ordersService.findVendorOrders(currentUser);
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
