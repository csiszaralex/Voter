import { ArgumentsHost } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { WebsocketExceptionFilter } from './ws-exception.filter';

interface MockClient {
  id: string;
  emit: jest.Mock;
}

describe('WebsocketExceptionFilter', () => {
  let filter: WebsocketExceptionFilter;
  let mockClient: MockClient;
  let mockHost: ArgumentsHost;

  beforeEach(() => {
    filter = new WebsocketExceptionFilter();
    mockClient = {
      id: 'client1',
      emit: jest.fn(),
    };
    mockHost = {
      switchToWs: () => ({
        getClient: () => mockClient,
      }),
    } as unknown as ArgumentsHost;

    // Silence console warn
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('should handle WsException with string message', () => {
    const exception = new WsException('Test Exception');
    filter.catch(exception, mockHost);

    expect(mockClient.emit).toHaveBeenCalledWith('error', {
      status: 'error',
      type: 'AuthorizationError',
      message: 'Test Exception',
    });
  });

  it('should handle WsException with object message', () => {
    const exception = new WsException({ message: ['Error 1', 'Error 2'] });
    filter.catch(exception, mockHost);

    expect(mockClient.emit).toHaveBeenCalledWith('error', {
      status: 'error',
      type: 'AuthorizationError',
      message: 'Error 1, Error 2',
    });
  });

  it('should handle WsException with object message (single string)', () => {
    const exception = new WsException({ message: 'Error 1' });
    filter.catch(exception, mockHost);

    expect(mockClient.emit).toHaveBeenCalledWith('error', {
      status: 'error',
      type: 'AuthorizationError',
      message: 'Error 1',
    });
  });

  it('should handle generic Error', () => {
    const exception = new Error('Generic Error');
    filter.catch(exception, mockHost);

    expect(mockClient.emit).toHaveBeenCalledWith('error', {
      status: 'error',
      type: 'BusinessLogicError',
      message: 'Generic Error',
    });
  });

  it('should handle unknown exception gracefully', () => {
    filter.catch({}, mockHost);
    // Fallback logic
    expect(mockClient.emit).toHaveBeenCalledWith('error', {
      status: 'error',
      type: 'ServerError',
      message: 'Internal Server Error',
    });
  });
});
