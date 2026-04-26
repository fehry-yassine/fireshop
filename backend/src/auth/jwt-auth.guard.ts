import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_COOKIE_NAME, getJwtSecret } from './auth.config';
import { AuthenticatedRequest, AuthTokenPayload } from './auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    try {
      request.user = await this.jwtService.verifyAsync<AuthTokenPayload>(token, {
        secret: getJwtSecret(),
      });
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private extractToken(request: AuthenticatedRequest) {
    const authorization = request.headers.authorization;
    const bearerHeader = Array.isArray(authorization)
      ? authorization[0]
      : authorization;

    if (bearerHeader?.startsWith('Bearer ')) {
      return bearerHeader.slice('Bearer '.length);
    }

    return this.extractCookieToken(request.headers.cookie);
  }

  private extractCookieToken(cookieHeader: string | string[] | undefined) {
    const header = Array.isArray(cookieHeader) ? cookieHeader[0] : cookieHeader;

    if (!header) {
      return null;
    }

    const cookies = header.split(';').map((cookie) => cookie.trim());
    const tokenCookie = cookies.find((cookie) =>
      cookie.startsWith(`${AUTH_COOKIE_NAME}=`),
    );

    return tokenCookie
      ? decodeURIComponent(tokenCookie.split('=').slice(1).join('='))
      : null;
  }
}
