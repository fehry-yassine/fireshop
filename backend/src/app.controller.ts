import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppService } from './app.service';
import {
  CSRF_HEADER_NAME,
  getCsrfCookie,
  setCsrfCookie,
} from './security/csrf';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('csrf-token')
  csrfToken(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const csrfToken = getCsrfCookie(request) ?? setCsrfCookie(response);

    return {
      csrfToken,
      headerName: CSRF_HEADER_NAME,
    };
  }
}
