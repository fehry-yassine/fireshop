import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CartService } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  getCart(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.cartService.getCart(currentUser);
  }

  @Post('items')
  addItem(@CurrentUser() currentUser: AuthTokenPayload, @Body() body: unknown) {
    return this.cartService.addItem(currentUser, body ?? {});
  }

  @Patch('items/:id')
  updateItem(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    return this.cartService.updateItem(currentUser, id, body ?? {});
  }

  @Delete('items/:id')
  removeItem(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.cartService.removeItem(currentUser, id);
  }

  @Delete()
  clearCart(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.cartService.clearCart(currentUser);
  }
}
