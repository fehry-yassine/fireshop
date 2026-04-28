import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CategoriesModule } from '../categories/categories.module';
import { OrdersModule } from '../orders/orders.module';
import { ProductsModule } from '../products/products.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [
    AuthModule,
    CategoriesModule,
    OrdersModule,
    ProductsModule,
    VendorsModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
