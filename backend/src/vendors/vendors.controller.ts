import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { AuthTokenPayload } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { VendorsService } from './vendors.service';

@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

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
