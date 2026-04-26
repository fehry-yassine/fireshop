import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from '../users/public-user';
import { getJwtSecret, JWT_EXPIRES_IN } from './auth.config';
import { AuthTokenPayload } from './auth.types';

type AuthPayload = {
  email?: unknown;
  password?: unknown;
  fullName?: unknown;
  phone?: unknown;
};

const PASSWORD_HASH_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: unknown) {
    const body = this.asPayload(payload);
    const email = this.normalizeEmail(body.email);
    const password = this.requiredPassword(body.password);
    const fullName = this.requiredString(body.fullName, 'fullName');
    const phone = this.optionalString(body.phone);
    const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

    try {
      const user = await this.prisma.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          role: Role.BUYER,
        },
      });

      return { user: toPublicUser(user) };
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async login(payload: unknown) {
    const body = this.asPayload(payload);
    const email = this.normalizeEmail(body.email);
    const password = this.requiredString(body.password, 'password');

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const publicUser = toPublicUser(user);
    const accessToken = await this.jwtService.signAsync(
      {
        sub: user.id,
        role: user.role,
      },
      {
        secret: getJwtSecret(),
        expiresIn: JWT_EXPIRES_IN,
      },
    );

    return {
      accessToken,
      user: publicUser,
    };
  }

  async getCurrentUser(currentUser: AuthTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return { user: toPublicUser(user) };
  }

  private asPayload(payload: unknown): AuthPayload {
    if (!payload || typeof payload !== 'object') {
      throw new BadRequestException('Request body is required');
    }

    return payload as AuthPayload;
  }

  private normalizeEmail(value: unknown) {
    const email = this.requiredString(value, 'email').toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new BadRequestException('email must be valid');
    }

    return email;
  }

  private requiredPassword(value: unknown) {
    const password = this.requiredString(value, 'password');

    if (password.length < 8) {
      throw new BadRequestException('password must be at least 8 characters');
    }

    return password;
  }

  private requiredString(value: unknown, field: string) {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new BadRequestException(`${field} is required`);
    }

    return value.trim();
  }

  private optionalString(value: unknown) {
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value !== 'string') {
      throw new BadRequestException('phone must be a string');
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private handlePrismaError(error: unknown): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException('Email already exists');
    }

    throw error;
  }
}
