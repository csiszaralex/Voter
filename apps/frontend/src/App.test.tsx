import { useGameState } from '@/hooks/useGameState';
import { fireEvent, render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';
import App from './App';

vi.mock('@/components/features/LoginForm', () => ({
  LoginForm: ({ onJoin }: { onJoin: (username: string, role: string) => void }) => (
    <button onClick={() => onJoin('test', 'user')}>Mock Login Form</button>
  ),
}));
vi.mock('@/components/features/AdminControls', () => ({
  AdminControls: () => <div data-testid='admin-controls'>Admin Panel</div>,
}));
vi.mock('@/components/features/UserControls', () => ({
  UserControls: () => <div data-testid='user-controls'>User Panel</div>,
}));
vi.mock('@/components/features/QueueList', () => ({
  QueueList: () => <div>Queue List</div>,
}));
vi.mock('@/components/features/ConnectedUsersCard', () => ({
  ConnectedUsersCard: () => <div>Users Card</div>,
}));
vi.mock('@/hooks/useWakeLock', () => ({
  useWakeLock: vi.fn(),
}));

vi.mock('@/hooks/useGameState');

describe('App Integration', () => {
  const defaultState = {
    isConnected: false,
    users: [],
    currentUser: null,
    voteSession: null,
    join: vi.fn(),
    socket: { emit: vi.fn() },
    lastVoteResult: null,
    hasVoted: false,
    error: null,
    clearError: vi.fn(),
    logout: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Alapértelmezésben reseteljük a hook visszatérési értékét
    (useGameState as Mock).mockReturnValue(defaultState);
  });

  it('renders LoginForm when not connected or no user', () => {
    (useGameState as Mock).mockReturnValue({
      ...defaultState,
      isConnected: true,
      currentUser: null,
    });

    render(<App />);

    expect(screen.getByText('Mock Login Form')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-controls')).not.toBeInTheDocument();
  });

  it('renders AdminControls for ADMIN role', () => {
    // Scenario 2: Admin user
    (useGameState as Mock).mockReturnValue({
      ...defaultState,
      isConnected: true,
      currentUser: { id: '1', username: 'Boss', role: 'ADMIN' },
    });

    render(<App />);

    expect(screen.getByTestId('admin-controls')).toBeInTheDocument();
    expect(screen.queryByTestId('user-controls')).not.toBeInTheDocument();
    // Queue listának is ott kell lennie
    expect(screen.getByText('Queue List')).toBeInTheDocument();
  });

  it('renders UserControls for USER role', () => {
    // Scenario 3: Sima user
    (useGameState as Mock).mockReturnValue({
      ...defaultState,
      isConnected: true,
      currentUser: { id: '2', username: 'Dev', role: 'USER' },
    });

    render(<App />);

    expect(screen.getByTestId('user-controls')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-controls')).not.toBeInTheDocument();
  });

  it('displays ErrorDialog when error is present', () => {
    // Scenario 4: Hibaüzenet
    (useGameState as Mock).mockReturnValue({
      ...defaultState,
      error: 'Connection Lost',
    });

    render(<App />);

    // Feltételezve, hogy az ErrorDialog megjeleníti a szöveget
    expect(screen.getByText('Connection Lost')).toBeInTheDocument();
  });

  it('calls join function when login is submitted', () => {
    const mockJoin = vi.fn();
    (useGameState as Mock).mockReturnValue({
      ...defaultState,
      join: mockJoin,
    });

    render(<App />);

    // A mockolt LoginForm-ban lévő gombot nyomjuk meg
    fireEvent.click(screen.getByText('Mock Login Form'));

    expect(mockJoin).toHaveBeenCalledWith('test', 'user');
  });

  it('updates document title based on user', () => {
    // Scenario: Title változás
    (useGameState as Mock).mockReturnValue({
      ...defaultState,
      currentUser: { id: '1', username: 'Hero', role: 'USER' },
    });

    render(<App />);

    // A useEffect aszinkron is lehet, de render után közvetlenül ellenőrizhető
    expect(document.title).toBe('Hero | Voter');
  });
});
