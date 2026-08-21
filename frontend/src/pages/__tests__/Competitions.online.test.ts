import { describe, expect, it } from 'vitest';
import { countOnlineStudents } from '../Competitions';

describe('countOnlineStudents', () => {
  it('counts unique human participants from active competitions only', () => {
    expect(countOnlineStudents([
      {
        id: 'active-1',
        status: 'active',
        created_date: '2026-06-02T12:00:00Z',
        participants: [
          { email: 'student@example.com' },
          { email: 'bot@studyai.app' },
        ],
      },
      {
        id: 'active-2',
        status: 'active',
        created_date: '2026-06-02T12:05:00Z',
        participants: [
          { email: 'student@example.com' },
          { email: 'second.student@example.com' },
        ],
      },
      {
        id: 'waiting-1',
        status: 'waiting',
        created_date: '2026-06-02T12:10:00Z',
        participants: [
          { email: 'waiting.student@example.com' },
        ],
      },
    ])).toBe(2);
  });
});
