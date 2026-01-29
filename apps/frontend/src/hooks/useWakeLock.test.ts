import { renderHook, waitFor } from '@testing-library/react';
import type { Mock } from 'vitest';
import { useWakeLock } from './useWakeLock';

describe('useWakeLock', () => {
  let requestMock: Mock;
  let releaseMock: Mock;
  let addEventListenerMock: Mock;

  beforeEach(() => {
    releaseMock = vi.fn().mockResolvedValue(undefined);
    addEventListenerMock = vi.fn();

    const mockSentinel = {
      release: releaseMock,
      addEventListener: addEventListenerMock,
    };

    requestMock = vi.fn().mockResolvedValue(mockSentinel);

    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: requestMock },
      writable: true,
      configurable: true,
    });

    Object.defineProperty(document, 'visibilityState', {
      value: 'visible',
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should not request lock if disabled', () => {
    const { result } = renderHook(() => useWakeLock(false));

    expect(requestMock).not.toHaveBeenCalled();
    expect(result.current.isLocked).toBe(false);
  });

  it('should request lock when enabled', async () => {
    const { result } = renderHook(() => useWakeLock(true));

    // Mivel a useEffect async, várnunk kell az állapotfrissítésre
    await waitFor(() => {
      expect(result.current.isLocked).toBe(true);
    });

    expect(requestMock).toHaveBeenCalledWith('screen');
    expect(result.current.error).toBeNull();
  });

  it('should release lock when unmounted', async () => {
    const { unmount } = renderHook(() => useWakeLock(true));

    // Először megvárjuk, hogy megszerezze a lockot
    await waitFor(() => expect(requestMock).toHaveBeenCalled());

    unmount();

    expect(releaseMock).toHaveBeenCalled();
  });

  it('should handle errors gracefully', async () => {
    // Szimulálunk egy hibát (pl. lemerült akku miatt tiltja a rendszer)
    const error = new Error('Battery too low');
    requestMock.mockRejectedValue(error);

    const { result } = renderHook(() => useWakeLock(true));

    await waitFor(() => {
      expect(result.current.error).toEqual(error);
    });
    expect(result.current.isLocked).toBe(false);
  });

  it('should re-acquire lock when visibility changes to visible', async () => {
    const { result } = renderHook(() => useWakeLock(true));
    await waitFor(() => expect(result.current.isLocked).toBe(true));

    // Reseteljük a hívásszámlálót az első sikeres kérés után
    requestMock.mockClear();

    // Szimuláljuk, hogy a user elváltott, majd visszajött
    // 1. Hidden
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Hidden állapotban nem kell újra kérnie (a logika szerint)
    expect(requestMock).not.toHaveBeenCalled();

    // 2. Visible
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
    document.dispatchEvent(new Event('visibilitychange'));

    // Most újra kérnie kell
    expect(requestMock).toHaveBeenCalledTimes(1);
  });

  it('should handle unsupported browser gracefully', () => {
    // Töröljük a wakeLock API-t a navigator-ból
    // @ts-expect-error - szándékosan töröljük teszteléshez
    delete navigator.wakeLock;

    const { result } = renderHook(() => useWakeLock(true));

    expect(result.current.isLocked).toBe(false);
    // Nem dob hibát, csak csendben nem csinál semmit (vagy visszatér)
  });
});
