import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  checkout(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Body() body: unknown,
  ) {
    return this.ordersService.checkout(currentUser, body ?? {});
  }

  @Get()
  findMyOrders(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.ordersService.findBuyerOrders(currentUser);
  }

  @Get(':id')
  findMyOrder(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.ordersService.findBuyerOrderById(currentUser, id);
  }
}
