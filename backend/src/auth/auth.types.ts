import { Role } from '@prisma/client';

export type AuthTokenPayload = {
  sub: string;
  role: Role;
};

export type AuthenticatedRequest = {
  headers: Record<string, string | string[] | undefined>;
  user?: AuthTokenPayload;
};

export type CookieResponse = {
  cookie: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax';
      maxAge: number;
      path: string;
    },
  ) => void;
  clearCookie: (name: string, options: { path: string }) => void;
};
