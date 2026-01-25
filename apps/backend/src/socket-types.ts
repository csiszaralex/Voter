import { Socket } from 'socket.io';
import { User } from '@repo/shared-types';

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: User;
  };
}
