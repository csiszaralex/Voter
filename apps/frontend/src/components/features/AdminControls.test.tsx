import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AdminControls } from './AdminControls';
import type { VoteSession } from '@repo/shared-types';

describe('AdminControls', () => {
  const defaultProps = {
    username: 'Admin User',
    voteSession: null,
    onClearReactions: vi.fn(),
    onStartVote: vi.fn(),
    onStopVote: vi.fn(),
    onLogout: vi.fn(),
  };

  it('does NOT show stop button when no active session', () => {
    render(<AdminControls {...defaultProps} voteSession={null} />);

    expect(screen.queryByText(/szavazás lezárása/i)).not.toBeInTheDocument();

    // Az indító gomboknak ott kell lenniük
    expect(screen.getByText('Nyílt')).toBeInTheDocument();
    expect(screen.getByText('Anonim')).toBeInTheDocument();
  });

  it('SHOWS stop button when session is active', () => {
    const activeSession: VoteSession = {
      isActive: true,
      isAnonymous: false,
      totalVoters: 5,
      currentVotes: 2
    };

    render(<AdminControls {...defaultProps} voteSession={activeSession} />);

    expect(screen.getByText(/szavazás lezárása/i)).toBeInTheDocument();
  });

  it('calls onStartVote with correct boolean param', () => {
    const onStartVoteMock = vi.fn<(isAnonymous: boolean) => void>();

    render(<AdminControls {...defaultProps} onStartVote={onStartVoteMock} />);

    // Nyílt gomb -> false
    fireEvent.click(screen.getByText('Nyílt'));
    expect(onStartVoteMock).toHaveBeenCalledWith(false);

    // Anonim gomb -> true
    fireEvent.click(screen.getByText('Anonim'));
    expect(onStartVoteMock).toHaveBeenCalledWith(true);
  });
});
