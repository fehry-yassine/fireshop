import { ForbiddenException } from '@nestjs/common';
import { randomBytes, timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const CSRF_COOKIE_NAME = 'localmarket_csrf_token';
export const CSRF_HEADER_NAME = 'x-csrf-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const TOKEN_BYTE_LENGTH = 32;
const CSRF_COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createCsrfToken() {
  return randomBytes(TOKEN_BYTE_LENGTH).toString('hex');
}

export function setCsrfCookie(response: Response, token = createCsrfToken()) {
  response.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions());
  return token;
}

export function getCsrfCookie(request: Request) {
  return parseCookieHeader(request.headers.cookie)[CSRF_COOKIE_NAME] ?? null;
}

export function csrfProtectionMiddleware(
  request: Request,
  _response: Response,
  next: NextFunction,
) {
  if (SAFE_METHODS.has(request.method.toUpperCase())) {
    next();
    return;
  }

  const cookieToken = getCsrfCookie(request);
  const headerToken = getCsrfHeader(request);

  if (!cookieToken || !headerToken || !tokensMatch(cookieToken, headerToken)) {
    next(new ForbiddenException('Invalid CSRF token'));
    return;
  }

  next();
}

function csrfCookieOptions() {
  const secureOverride = process.env.AUTH_COOKIE_SECURE;
  const secure =
    secureOverride === 'true' ||
    (secureOverride !== 'false' && process.env.NODE_ENV === 'production');

  return {
    httpOnly: false,
    maxAge: CSRF_COOKIE_MAX_AGE_MS,
    path: '/',
    sameSite: 'lax' as const,
    secure,
  };
}

function getCsrfHeader(request: Request) {
  const value = request.headers[CSRF_HEADER_NAME];

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return typeof value === 'string' ? value : null;
}

function tokensMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCookieHeader(cookieHeader: string | undefined) {
  const cookies: Record<string, string> = {};

  if (!cookieHeader) {
    return cookies;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const key = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (key) {
      try {
        cookies[key] = decodeURIComponent(value);
      } catch {
        cookies[key] = value;
      }
    }
  }

  return cookies;
}
