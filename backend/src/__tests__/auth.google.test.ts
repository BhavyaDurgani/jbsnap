import { describe, it, expect, vi } from 'vitest';
import { googleLogin } from '../controllers/auth.js';
import { prisma } from '../services/db.js';

describe('Google Authentication Controller', () => {
  it('should return 400 Bad Request when email is missing and no credential supplied', async () => {
    const request: any = {
      body: {},
      log: { error: vi.fn(), warn: vi.fn() },
    };

    let statusCode = 200;
    let responseBody: any = null;

    const reply: any = {
      status: vi.fn((code: number) => {
        statusCode = code;
        return reply;
      }),
      send: vi.fn((payload: any) => {
        responseBody = payload;
        return reply;
      }),
      jwtSign: vi.fn(async () => 'mock-jwt-token'),
    };

    await googleLogin(request, reply);

    expect(statusCode).toBe(400);
    expect(responseBody.error).toMatch(/email is required/i);
  });
});
