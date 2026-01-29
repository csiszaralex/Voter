import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { QueueList } from './QueueList';
import type { User, HandType } from '@repo/shared-types';
import userEvent from '@testing-library/user-event';

describe('QueueList Logic', () => {
  // Segédfüggvény valid User objektum gyártásához
  const createMockUser = (overrides: Partial<User>): User => ({
    id: 'default-id',
    username: 'Default User',
    role: 'USER',
    reaction: null,
    isConnected: true,
    hands: { topicAt: null, replyAt: null },
    ...overrides, // Felülírjuk az átadott tulajdonságokkal
  });

  it('correctly sorts users: REPLY should come before TOPIC', () => {
    const users: User[] = [
      createMockUser({
        id: '1',
        username: 'Early Topic User',
        hands: { topicAt: 100, replyAt: null }
      }),
      createMockUser({
        id: '2',
        username: 'Late Reply User',
        hands: { topicAt: null, replyAt: 200 } // Később, de REPLY
      }),
      createMockUser({
        id: '3',
        username: 'Late Topic User',
        hands: { topicAt: 300, replyAt: null }
      }),
    ];

    render(<QueueList users={users} isAdmin={false} onLowerHand={vi.fn()} />);

    const items = screen.getAllByText(/User/);

    // Ellenőrizzük a sorrendet a DOM-ban
    // 1. Reply User (mert REPLY prioritás)
    expect(items[0]).toHaveTextContent('Late Reply User');
    // 2. Early Topic User (időrend)
    expect(items[1]).toHaveTextContent('Early Topic User');
    // 3. Late Topic User
    expect(items[2]).toHaveTextContent('Late Topic User');
  });

  it('renders empty state message when no hands are raised', () => {
    const users: User[] = [
      createMockUser({
        id: '1',
        username: 'Idle User',
        hands: { topicAt: null, replyAt: null }
      })
    ];

    render(<QueueList users={users} isAdmin={false} onLowerHand={vi.fn()} />);

    expect(screen.getByText('Nincs jelentkező')).toBeInTheDocument();
  });

  it('shows close button only for admins', async () => {
    const user = userEvent.setup();
    const onLowerHandMock = vi.fn<(id: string, type: HandType) => void>();

    const users: User[] = [
      createMockUser({
        id: '123',
        username: 'Talker',
        hands: { topicAt: 100, replyAt: null }
      })
    ];

    render(<QueueList users={users} isAdmin={true} onLowerHand={onLowerHandMock} />);

    // Megkeressük a törlés gombot (title attribútum alapján)
    const closeButton = screen.getByTitle('Felszólítás / Kéz le');
    expect(closeButton).toBeInTheDocument();

    await user.click(closeButton);
    expect(onLowerHandMock).toHaveBeenCalledWith('123', 'TOPIC');
  });
});
