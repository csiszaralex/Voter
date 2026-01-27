// User szerepkörök
export type UserRole = 'USER' | 'ADMIN' | 'GUEST' | 'ADVISOR';

export type VoteOption = 'IGEN' | 'NEM' | 'TARTOZKODOM';
export type HandType = 'TOPIC' | 'REPLY';

// User állapota
export interface HandState {
  topicAt: number | null; // Timestamp
  replyAt: number | null; // Timestamp
}

export interface User {
  id: string; // Stable User ID (not socket.id)
  username: string;
  role: UserRole;
  reaction: 'LIKE' | null;
  hands: HandState;
  isConnected: boolean;
}

// Szavazás állapota (publikus info)
export interface VoteSession {
  isActive: boolean;
  isAnonymous: boolean;
  totalVoters: number;
  currentVotes: number;
}

// Szavazás eredménye (lezáráskor)
export interface VoteResult {
  isAnonymous: boolean;
  summary: Record<VoteOption, number>;
  details?: { username: string; vote: VoteOption }[];
}

// --- DTO-k (Data Transfer Objects) ---

// Client -> Server
export interface JoinDto {
  username: string;
  role: UserRole;
}

export interface RaiseHandDto {
  type: HandType;
}

export interface AdminLowerHandDto {
  targetId: string;
  type: HandType;
}

export interface StartVoteDto {
  isAnonymous: boolean;
}

export interface CastVoteDto {
  vote: VoteOption;
}
