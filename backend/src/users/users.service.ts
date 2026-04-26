import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthTokenPayload } from '../auth/auth.types';
import { PrismaService } from '../prisma/prisma.service';
import { toPublicUser } from './public-user';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUser(currentUser: AuthTokenPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User session is no longer valid');
    }

    return { user: toPublicUser(user) };
  }
}
