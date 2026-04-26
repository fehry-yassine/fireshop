import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { CategoriesModule } from '../categories/categories.module';
import { VendorsModule } from '../vendors/vendors.module';

@Module({
  imports: [AuthModule, CategoriesModule, VendorsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
