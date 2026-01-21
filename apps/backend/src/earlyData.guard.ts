import { CanActivate, ExecutionContext, HttpException, Injectable } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class EarlyDataGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    const earlyData = request.headers['early-data'];

    if (!earlyData || earlyData !== '1') {
      return true;
    }

    const safeMethods = ['GET', 'HEAD', 'OPTIONS'];

    if (!safeMethods.includes(request.method)) {
      throw new HttpException('Too Early', 425);
    }

    return true;
  }
}
