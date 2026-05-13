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
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { HomepagePromosService } from './homepage-promos.service';

@Controller('homepage-promos')
export class PublicHomepagePromosController {
  constructor(private readonly homepagePromosService: HomepagePromosService) {}

  @Get()
  findPublic() {
    return this.homepagePromosService.findPublic();
  }
}

@Controller('admin/homepage-promos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminHomepagePromosController {
  constructor(private readonly homepagePromosService: HomepagePromosService) {}

  @Get()
  findAll(@Query('type') type?: string) {
    return this.homepagePromosService.findAllAdmin({ type });
  }

  @Post()
  create(@Body() body: unknown) {
    return this.homepagePromosService.createAdmin(body ?? {});
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: unknown) {
    return this.homepagePromosService.updateAdmin(id, body ?? {});
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.homepagePromosService.softDeleteAdmin(id);
  }
}
