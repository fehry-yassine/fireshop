import { InternalServerErrorException } from '@nestjs/common';

export const AUTH_COOKIE_NAME = 'localmarket_access_token';
export const JWT_EXPIRES_IN = '1d';
export const JWT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const INSECURE_JWT_SECRETS = new Set([
  'localmarket-dev-secret-change-before-production',
  'replace-with-a-long-random-secret',
]);

export function getJwtSecret() {
  const secret = process.env.JWT_ACCESS_SECRET?.trim();

  if (secret) {
    if (
      process.env.NODE_ENV === 'production' &&
      INSECURE_JWT_SECRETS.has(secret)
    ) {
      throw new InternalServerErrorException(
        'JWT_ACCESS_SECRET must be changed before production',
      );
    }

    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new InternalServerErrorException('JWT_ACCESS_SECRET is not configured');
  }

  return 'localmarket-dev-secret-change-before-production';
}

export function authCookieOptions() {
  const secureOverride = process.env.AUTH_COOKIE_SECURE;
  const secure =
    secureOverride === 'true' ||
    (secureOverride !== 'false' && process.env.NODE_ENV === 'production');

  return {
    httpOnly: true,
    secure,
    sameSite: 'lax' as const,
    maxAge: JWT_MAX_AGE_MS,
    path: '/',
  };
}
