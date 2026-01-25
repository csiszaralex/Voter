import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { ROLES_KEY, RolesMetadata } from './roles.decorator';
import { AuthenticatedSocket } from './socket-types';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<RolesMetadata>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!metadata) {
      return true;
    }

    const client = context.switchToWs().getClient<AuthenticatedSocket>();
    const user = client.data.user;

    if (!user) {
      this.logger.error(`Unauthenticated access attempt by clientId=${client.id}`);
      throw new WsException('Nem vagy bejelentkezve!');
    }

    if (!metadata.roles.includes(user.role)) {
      this.logger.warn(
        `Access denied: User "${user.username}" (${user.role}) tried to access "${context.getHandler().name}". Required: [${metadata.roles.join(', ')}]`,
      );

      throw new WsException(metadata.errorMessage || 'Nincs jogosultságod ehhez a művelethez!');
    }

    return true;
  }
}
