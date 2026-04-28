import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ProductsController,
  VendorProductsController,
} from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ProductsController, VendorProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
