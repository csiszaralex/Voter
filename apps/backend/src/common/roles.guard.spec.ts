import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WsException } from '@nestjs/websockets';
import { UserRole } from '@repo/shared-types';
import { RolesGuard } from './roles.guard';

interface User {
  username: string;
  role: UserRole;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
    // Silence logger
    jest.spyOn(guard['logger'], 'error').mockImplementation(() => {});
    jest.spyOn(guard['logger'], 'warn').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  const createMockContext = (handlerRoles: UserRole[] | null, user: User | undefined | null) => {
    const handler = () => {};
    const cls = class {};

    // Mock reflector
    jest
      .spyOn(reflector, 'getAllAndOverride')
      .mockReturnValue(handlerRoles ? { roles: handlerRoles } : null);

    const client = {
      id: 'client1',
      data: { user },
    };

    const context = {
      getHandler: () => handler,
      getClass: () => cls,
      switchToWs: () => ({
        getClient: () => client,
      }),
    } as unknown as ExecutionContext;

    return context;
  };

  it('should allow if no roles are defined', () => {
    const context = createMockContext(null, null);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw if user is not authenticated (no user in data)', () => {
    const context = createMockContext(['USER'], undefined);
    expect(() => guard.canActivate(context)).toThrow(WsException);
  });

  it('should allow if user has required role', () => {
    const context = createMockContext(['USER'], { username: 'test', role: 'USER' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow if user has one of required roles', () => {
    const context = createMockContext(['ADMIN', 'ADVISOR'], { username: 'test', role: 'ADMIN' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw if user does not have required role', () => {
    const context = createMockContext(['ADMIN'], { username: 'test', role: 'USER' });
    expect(() => guard.canActivate(context)).toThrow(WsException);
  });
});
