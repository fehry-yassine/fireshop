import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthTokenPayload } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notificationsService.findAllForUser(currentUser.sub, {
      page,
      limit,
    });
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.notificationsService.getUnreadCount(currentUser.sub);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() currentUser: AuthTokenPayload) {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser() currentUser: AuthTokenPayload,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(currentUser.sub, id);
  }
}
