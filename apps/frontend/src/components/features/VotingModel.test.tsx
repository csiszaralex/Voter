import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { VotingModal } from './VotingModal';
import type { VoteSession, VoteOption } from '@repo/shared-types';

describe('VotingModal', () => {
  const mockSession: VoteSession = {
    isActive: true,
    isAnonymous: false,
    totalVoters: 10,
    currentVotes: 0,
  };

  it('renders voting options when user has not voted', () => {
    render(
      <VotingModal
        session={mockSession}
        hasVoted={false}
        onVote={vi.fn()}
      />
    );

    expect(screen.getByText('IGEN')).toBeInTheDocument();
    expect(screen.getByText('NEM')).toBeInTheDocument();
    expect(screen.getByText('TARTÓZKODOM')).toBeInTheDocument();
  });

  it('calls onVote with correct value when option clicked', () => {
    const onVoteMock = vi.fn<(vote: VoteOption) => void>();

    render(
      <VotingModal
        session={mockSession}
        hasVoted={false}
        onVote={onVoteMock}
      />
    );

    // IGEN gomb tesztelése
    fireEvent.click(screen.getByText('IGEN'));
    expect(onVoteMock).toHaveBeenCalledWith('IGEN');

    // NEM gomb tesztelése
    fireEvent.click(screen.getByText('NEM'));
    expect(onVoteMock).toHaveBeenCalledWith('NEM');
  });

  it('does not render (is closed) when session is not active', () => {
    const inactiveSession: VoteSession = { ...mockSession, isActive: false };

    render(
      <VotingModal
        session={inactiveSession}
        hasVoted={false}
        onVote={vi.fn()}
      />
    );

    // Mivel a Dialog open={false}, a tartalma nincs a DOM-ban
    expect(screen.queryByText('IGEN')).not.toBeInTheDocument();
  });
});
