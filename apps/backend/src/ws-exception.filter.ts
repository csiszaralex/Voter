import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

interface NestErrorResponse {
  message: string | string[];
  error?: string;
  statusCode?: number;
}
@Catch()
export class WebsocketExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();

    // Default hibaüzenet
    let message = 'Internal Server Error';
    let type = 'ServerError';

    if (exception instanceof WsException) {
      const errorPayload = exception.getError(); // Ez lehet string vagy object
      type = 'AuthorizationError';

      if (typeof errorPayload === 'string') {
        message = errorPayload;
      } else if (typeof errorPayload === 'object' && errorPayload !== null) {
        const errorObj = errorPayload as NestErrorResponse;

        if (Array.isArray(errorObj.message)) {
          message = errorObj.message.join(', ');
        } else {
          message = errorObj.message || 'Ismeretlen hiba';
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      type = 'BusinessLogicError';
    }

    // Opcionális: Ha használsz HttpException-t (pl. NotFoundException) a service-ben
    // azt is kezelheted külön, de a fenti Error instanceof lefedi az alapokat.

    console.warn(`WS Error handled for ${client.id}: [${type}] ${message}`);

    // Válasz a kliensnek
    client.emit('error', {
      status: 'error',
      type,
      message,
    });
  }
}
