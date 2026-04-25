import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProductsModule } from './products/products.module';
import { UsersModule } from './users/users.module';
import { VendorsModule } from './vendors/vendors.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    VendorsModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    AdminModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
