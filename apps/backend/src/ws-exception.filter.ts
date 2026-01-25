import { Catch, ArgumentsHost } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(WsException)
export class WebsocketExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: WsException, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const error = exception.getError();
    const details = error instanceof Object ? { ...error } : { message: error };

    // Ugyanazt a formátumot küldjük, amit eddig manuálisan
    client.emit('error', {
      message: details.message || 'Ismeretlen hiba',
    });

    // Opcionális: logging
    // console.log(`Error emitted to ${client.id}:`, details);
  }
}
