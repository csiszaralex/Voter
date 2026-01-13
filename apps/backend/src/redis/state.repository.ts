import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { User, VoteOption, VoteSession, VoteResult } from '@repo/shared-types';

@Injectable()
export class StateRepository {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  // --- KULCSOK KEZELÉSE ---
  // user:{socketId} -> User adatok
  // session:{sessionId} -> User adatok (reconnection support)
  // vote:session -> VoteSession config
  // vote:votes -> Hash Map (socketId -> vote)

  // --- USER MŰVELETEK ---

  async saveUser(user: User): Promise<void> {
    await this.redis.set(`user:${user.id}`, JSON.stringify(user));
  }

  async getUser(socketId: string): Promise<User | null> {
    const data = await this.redis.get(`user:${socketId}`);
    return data ? JSON.parse(data) : null;
  }

  async removeUser(socketId: string): Promise<void> {
    await this.redis.del(`user:${socketId}`);
  }

  async getAllUsers(): Promise<User[]> {
    // Ez Redisben lassú lehet (KEYS *), productionben inkább egy SET-ben tároljuk az ID-kat.
    // MVP-nek most a KEYS minta megteszi, de tudd, hogy ez O(N).
    const keys = await this.redis.keys('user:*');
    if (keys.length === 0) return [];

    // Pipeline: egyszerre kérjük le az összeset
    const usersJson = await this.redis.mget(keys);
    return usersJson.map(((jso)n) =(> (json ? JSON.parse(json) : nu)ll)).filter(Boolean);
  }

  // --- DISCONNECT / RECONNECT LOGIKA ---
  // A setTimeout helyett Redis TTL-t használunk
  async markUserDisconnected(sessionId: string) {
    // Beállítunk 60mp lejáratot a session kulcsra
    await this.redis.expire(`session:${sessionId}`, 60);
  }

  async markUserConnected(user: User) {
    // Visszaállítjuk a hosszú lejáratot (pl. 1 nap)
    await this.redis.set(`session:${user.sessionId}`, JSON.stringify(user), 'EX', 86400);
  }

  // --- SZAVAZÁS ---

  async saveVoteSession(session: { isActive: boolean; isAnonymous: boolean }) {
    await this.redis.set('vote:config', JSON.stringify(session));
    if (session.isActive) {
      // Új szavazásnál töröljük a korábbi voksokat
      await this.redis.del('vote:votes');
    }
  }

  async getVoteSessionConfig() {
    const data = await this.redis.get('vote:config');
    return data ? JSON.parse(data) : { isActive: false, isAnonymous: false };
  }

  async addVote(socketId: string, vote: VoteOption) {
    await this.redis.hset('vote:votes', socketId, vote);
  }

  async getVotes(): Promise<Map<string, VoteOption>> {
    const allVotes = await this.redis.hgetall('vote:votes');
    // Object -> Map konverzió
    const map = new Map<string, VoteOption>();
    Object.entries(allVotes).forEach(([key, value]) => map.set(key, value as VoteOption));
    return map;
  }

  // Törli az összes adatot (pl. szerver induláskor clean start, opcionális)
  async clearAll() {
  // await this.redis.flushall(); // VIGYÁZAT, mindent töröl!
  }
}
