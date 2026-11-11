import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { runHealthRoutes } from '../routes/health.js';

describe('Health Routes - Fastify Integration Test', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify();
    await runHealthRoutes(app);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health should return 200 OK with status "ok"', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ok');
    expect(body.message).toContain('JBSnap Backend');
    expect(body.timestamp).toBeDefined();
  });
});
