import { ExecutionContext, HttpException } from '@nestjs/common';
import { EarlyDataGuard } from './earlyData.guard';

describe('EarlyDataGuard', () => {
  let guard: EarlyDataGuard;

  beforeEach(() => {
    guard = new EarlyDataGuard();
  });

  const createMockContext = (
    headers: Record<string, string | undefined> = {},
    method: string = 'GET',
  ) => {
    const request = {
      headers,
      method,
    };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow if no early-data header', () => {
    const context = createMockContext();
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow if early-data header is not "1"', () => {
    const context = createMockContext({ 'early-data': '2' });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow for WebSocket upgrade request even if early-data is "1"', () => {
    const context = createMockContext({
      'early-data': '1',
      upgrade: 'websocket',
    });
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow safe methods when early-data is "1"', () => {
    const context = createMockContext({ 'early-data': '1' }, 'GET');
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw HttpException for unsafe methods when early-data is "1"', () => {
    const context = createMockContext({ 'early-data': '1' }, 'POST');
    expect(() => guard.canActivate(context)).toThrow(HttpException);
    expect(() => guard.canActivate(context)).toThrow('Too Early');
  });
});
