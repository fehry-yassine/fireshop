import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  ProductsController,
  VendorProductsController,
} from './products.controller';
import { ProductCrudService } from './product-crud.service';
import { ProductLifecycleService } from './product-lifecycle.service';
import { ProductMediaService } from './product-media.service';
import { ProductQueryService } from './product-query.service';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule, AuthModule, NotificationsModule],
  controllers: [ProductsController, VendorProductsController],
  providers: [
    ProductCrudService,
    ProductLifecycleService,
    ProductMediaService,
    ProductQueryService,
    ProductsService,
  ],
  exports: [ProductsService],
})
export class ProductsModule {}
