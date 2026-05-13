import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import {
  AdminHomepagePromosController,
  PublicHomepagePromosController,
} from './homepage-promos.controller';
import { HomepagePromosService } from './homepage-promos.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PublicHomepagePromosController, AdminHomepagePromosController],
  providers: [HomepagePromosService],
})
export class HomepagePromosModule {}
