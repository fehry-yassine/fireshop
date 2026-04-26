import { InternalServerErrorException } from '@nestjs/common';

export const AUTH_COOKIE_NAME = 'localmarket_access_token';
export const JWT_EXPIRES_IN = '1d';
export const JWT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET;

  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new InternalServerErrorException('JWT_ACCESS_SECRET is not configured');
  }

  return 'localmarket-dev-secret-change-before-production';
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: JWT_MAX_AGE_MS,
    path: '/',
  };
}
