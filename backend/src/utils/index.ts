import { UserRow } from '../types';

/** Convert a Date or ISO string to an ISO date string (YYYY-MM-DD) */
export function toDateString(val: string | Date): string {
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  // If it's already a ISO string like "2026-06-01T13:00:00.000Z", extract date part
  if (val.includes('T')) {
    return val.split('T')[0];
  }
  return val;
}

/** Convert a database UserRow to the API-facing User shape */
export function userRowToUser(row: UserRow) {
  return {
    id: String(row.id),
    username: row.username,
    email: row.email,
    nickname: row.nickname || '',
    avatar: row.avatar,
    bio: row.bio,
    role: row.role,
    createdAt: toDateString(row.created_at),
  };
}

/** No-op: pg driver auto-parses JSONB columns. Kept for backward compat. */
export function parseJSON<T>(value: T, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  // If it's still a string (shouldn't happen with JSONB, but be safe)
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value;
}
