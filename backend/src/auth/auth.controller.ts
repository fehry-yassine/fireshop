import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AUTH_COOKIE_NAME, authCookieOptions } from './auth.config';
import { CurrentUser } from './current-user.decorator';
import { AuthTokenPayload, CookieResponse } from './auth.types';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() body: unknown) {
    return this.authService.register(body);
  }

  @Post('login')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: CookieResponse) {
    const session = await this.authService.login(body);
    res.cookie(AUTH_COOKIE_NAME, session.accessToken, authCookieOptions());

    return { user: session.user };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: CookieResponse) {
    res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.authService.getCurrentUser(currentUser);
  }
}
