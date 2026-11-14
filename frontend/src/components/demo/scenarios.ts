export type NodeId = 'trigger' | 'auth' | 'sandbox' | 'db' | 'response';
export type ScenarioId = 'users' | 'orders' | 'reports';
export type StageStatus = 'ok' | 'error' | 'skipped';
export type PlaybackSpeed = 0.5 | 1 | 2;

export interface ChaosOptions {
  jwtStatus: 'valid' | 'expired';
  rateLimit: 'normal' | 'exceeded';
  sandboxTimeout: 'normal' | 'slow';
  dbLatency: 'fast' | 'slow';
}

export const DEFAULT_CHAOS: ChaosOptions = {
  jwtStatus: 'valid',
  rateLimit: 'normal',
  sandboxTimeout: 'normal',
  dbLatency: 'fast',
};

export interface StagePayload {
  config?: Record<string, unknown>;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  metrics?: Record<string, unknown>;
  codeSnippet?: string;
}

export interface DemoStageDef {
  id: NodeId;
  name: string;
  shortName: string;
  desc: string;
  icon: string;
  color: string;
  durationMs: number;
  status: StageStatus;
  log: string;
  latencyMs: number;
  payload: StagePayload;
}

export interface ResolvedScenario {
  id: ScenarioId;
  title: string;
  method: 'GET' | 'POST';
  path: string;
  stages: DemoStageDef[];
  totalLatencyMs: number;
  totalDurationMs: number;
  finalStatus: {
    code: number;
    text: string;
    success: boolean;
  };
  finalResponse: {
    statusCode: number;
    headers: Record<string, string>;
    body: unknown;
  };
}

export const SCENARIO_META: Record<
  ScenarioId,
  { label: string; method: 'GET' | 'POST'; path: string; desc: string }
> = {
  users: {
    label: 'Users API',
    method: 'GET',
    path: '/api/v1/users',
    desc: 'Standard authenticated read pipeline with database querying and payload mapping',
  },
  orders: {
    label: 'Checkout API',
    method: 'POST',
    path: '/api/v1/orders',
    desc: 'Write pipeline with schema validation, transactional DB insert, and event emission',
  },
  reports: {
    label: 'Analytics API',
    method: 'GET',
    path: '/api/v1/reports',
    desc: 'Heavy data query with aggregation grouping, in-memory formatting, and caching',
  },
};

export function getResolvedScenario(
  scenarioId: ScenarioId,
  chaos: ChaosOptions = DEFAULT_CHAOS
): ResolvedScenario {
  // Check chaos precedence: Rate Limit (Trigger fails) > Expired JWT (Auth fails) > Sandbox Timeout (Sandbox fails)
  const isRateLimited = chaos.rateLimit === 'exceeded';
  const isJwtExpired = !isRateLimited && chaos.jwtStatus === 'expired';
  const isSandboxTimedOut = !isRateLimited && !isJwtExpired && chaos.sandboxTimeout === 'slow';
  const isDbSlow = chaos.dbLatency === 'slow';

  if (scenarioId === 'orders') {
    return resolveOrdersScenario(isRateLimited, isJwtExpired, isSandboxTimedOut, isDbSlow);
  }
  if (scenarioId === 'reports') {
    return resolveReportsScenario(isRateLimited, isJwtExpired, isSandboxTimedOut, isDbSlow);
  }
  // Default: users (preserves original strings)
  return resolveUsersScenario(isRateLimited, isJwtExpired, isSandboxTimedOut, isDbSlow);
}

function resolveUsersScenario(
  isRateLimited: boolean,
  isJwtExpired: boolean,
  isSandboxTimedOut: boolean,
  isDbSlow: boolean
): ResolvedScenario {
  const dbMs = isDbSlow ? 142 : 14;

  const stageTrigger: DemoStageDef = {
    id: 'trigger',
    name: '1. HTTP Trigger',
    shortName: 'Trigger',
    desc: 'Incoming request on wildcard edge gateway',
    icon: 'Globe',
    color: '#6366f1',
    durationMs: 700,
    status: isRateLimited ? 'error' : 'ok',
    log: isRateLimited
      ? '[Gateway] 429 Too Many Requests - IP 192.0.2.44 rate limit exceeded (100 req/min)'
      : '[Gateway] GET /api/v1/users',
    latencyMs: 0.8,
    payload: {
      config: {
        route: '/api/v1/users',
        method: 'GET',
        wildcardEdge: true,
        cors: 'enabled (*)',
        keepAliveTimeout: '5000ms',
        requestTimeout: '10000ms',
      },
      input: {
        method: 'GET',
        path: '/api/v1/users',
        headers: {
          host: 'api.jbsnap.app',
          'user-agent': 'curl/8.4.0',
          accept: 'application/json',
          authorization: isJwtExpired ? 'Bearer eyJhbGciOi...[EXPIRED]' : 'Bearer eyJhbGciOi...[VALID]',
        },
      },
    },
  };

  const stageAuth: DemoStageDef = {
    id: 'auth',
    name: '2. Auth Guard',
    shortName: 'Auth Guard',
    desc: 'Verify JWT signature & encryption key',
    icon: 'Lock',
    color: '#a78bfa',
    durationMs: 650,
    status: isRateLimited ? 'skipped' : isJwtExpired ? 'error' : 'ok',
    log: isRateLimited
      ? '[Auth] Skipped due to gateway 429'
      : isJwtExpired
      ? '[Auth] ERROR: TokenExpiredError: jwt expired at 2026-11-14T12:00:00Z'
      : '[Auth] Validated JWT signature for user_id: 981',
    latencyMs: 1.2,
    payload: {
      config: {
        algorithm: 'RS256',
        publicKey: 'vault://secrets/jwt_public.pem',
        audience: 'https://jbsnap.app',
        issuer: 'auth.jbsnap.app',
        strictCheckExpiry: true,
      },
      metrics: {
        signatureVerificationMs: 1.1,
        tokenAge: isJwtExpired ? '38 days (expired)' : '14 minutes',
      },
      output: isJwtExpired
        ? { error: 'invalid_token', error_description: 'The access token expired' }
        : {
            sub: 'usr_01HGB981X',
            role: 'developer',
            org: 'JBSnap Labs',
            exp: 1794576000,
          },
    },
  };

  const stageSandbox: DemoStageDef = {
    id: 'sandbox',
    name: '3. JS Sandbox',
    shortName: 'JS Sandbox',
    desc: 'Secure Node.js VM isolated logic',
    icon: 'Cpu',
    color: '#f59e0b',
    durationMs: isSandboxTimedOut ? 900 : 750,
    status: isRateLimited || isJwtExpired ? 'skipped' : isSandboxTimedOut ? 'error' : 'ok',
    log: isRateLimited || isJwtExpired
      ? '[Sandbox] Pipeline short-circuited; execution bypassed'
      : isSandboxTimedOut
      ? '[Sandbox] ERROR: ExecutionTimeout: Script exceeded 200ms CPU isolation ceiling'
      : '[Sandbox] Executing custom logic mapping block (took 2.4ms)',
    latencyMs: isSandboxTimedOut ? 204.1 : 2.4,
    payload: {
      config: {
        engine: 'Node.js Isolated-VM',
        memoryLimit: '128MB',
        cpuTimeoutMs: 200,
        allowedGlobals: ['JSON', 'Math', 'Buffer', 'crypto'],
      },
      codeSnippet: `export default async function transform(context) {\n  const { query, user } = context;\n  return {\n    tenantId: user.org,\n    limit: Math.min(parseInt(query.limit) || 50, 100),\n    sanitized: true\n  };\n}`,
      output: isSandboxTimedOut
        ? { error: 'CPU_TIMEOUT', maxMs: 200, elapsedMs: 204.1 }
        : { tenantId: 'JBSnap Labs', limit: 50, sanitized: true },
    },
  };

  const stageDb: DemoStageDef = {
    id: 'db',
    name: '4. Neon DB',
    shortName: 'Neon Postgres',
    desc: 'PostgreSQL database query via Prisma',
    icon: 'Database',
    color: '#38bdf8',
    durationMs: isDbSlow ? 1100 : 800,
    status: isRateLimited || isJwtExpired || isSandboxTimedOut ? 'skipped' : 'ok',
    log: isRateLimited || isJwtExpired || isSandboxTimedOut
      ? '[Prisma] Database connection skipped'
      : isDbSlow
      ? `[Prisma] SELECT * FROM "User" LIMIT 50 (took ${dbMs}ms - pool latency: 128ms)`
      : `[Prisma] SELECT * FROM "User" LIMIT 50 (took ${dbMs}ms)`,
    latencyMs: dbMs,
    payload: {
      config: {
        client: '@prisma/adapter-pg',
        database: 'PostgreSQL 16 (Neon Serverless)',
        poolSize: 10,
        preparedStatements: true,
      },
      metrics: {
        connectionAcquireMs: isDbSlow ? 128.4 : 1.2,
        queryExecutionMs: 12.8,
        rowsAffected: 50,
      },
      output: {
        query: 'SELECT id, email, username, plan, created_at FROM "User" WHERE tenant = $1 LIMIT $2',
        params: ['JBSnap Labs', 50],
        resultsCount: 50,
      },
    },
  };

  const stageResponse: DemoStageDef = {
    id: 'response',
    name: '5. Response',
    shortName: 'Fastify Output',
    desc: 'Fastify returns response JSON schema',
    icon: 'CheckCircle',
    color: '#10b981',
    durationMs: 650,
    status: isRateLimited || isJwtExpired || isSandboxTimedOut ? 'skipped' : 'ok',
    log: isRateLimited
      ? '[Response] 429 Too Many Requests returned (68 bytes)'
      : isJwtExpired
      ? '[Response] 401 Unauthorized returned (82 bytes)'
      : isSandboxTimedOut
      ? '[Response] 504 Gateway Timeout returned (94 bytes)'
      : '[Response] 200 OK returned with payload (240 bytes)',
    latencyMs: 0.4,
    payload: {
      config: {
        framework: 'Fastify v5.8',
        compression: '@fastify/compress (brotli/gzip)',
        schemaValidation: 'fast-json-stringify',
      },
      output: {
        statusCode: isRateLimited ? 429 : isJwtExpired ? 401 : isSandboxTimedOut ? 504 : 200,
        bytesSent: isRateLimited ? 68 : isJwtExpired ? 82 : isSandboxTimedOut ? 94 : 240,
      },
    },
  };

  const stages = [stageTrigger, stageAuth, stageSandbox, stageDb, stageResponse];

  let finalCode = 200;
  let finalText = 'OK';
  let success = true;

  if (isRateLimited) {
    finalCode = 429;
    finalText = 'Too Many Requests';
    success = false;
  } else if (isJwtExpired) {
    finalCode = 401;
    finalText = 'Unauthorized';
    success = false;
  } else if (isSandboxTimedOut) {
    finalCode = 504;
    finalText = 'Gateway Timeout';
    success = false;
  }

  const activeLatencyStages = stages.filter(s => s.status === 'ok' || s.status === 'error');
  const totalLatency = Number(
    activeLatencyStages.reduce((acc, curr) => acc + curr.latencyMs, 0).toFixed(1)
  );

  return {
    id: 'users',
    title: 'GET /api/v1/users',
    method: 'GET',
    path: '/api/v1/users',
    stages,
    totalLatencyMs: totalLatency,
    totalDurationMs: stages.reduce((acc, s) => acc + s.durationMs, 0),
    finalStatus: { code: finalCode, text: finalText, success },
    finalResponse: {
      statusCode: finalCode,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'x-gateway-latency': `${totalLatency}ms`,
        'x-jbsnap-engine': 'fastify-ts/2.4',
        'cache-control': 'private, no-cache',
      },
      body: success
        ? {
            success: true,
            totalUsers: 50,
            tenant: 'JBSnap Labs',
            data: [
              { id: 'usr_01', email: 'alex@company.com', role: 'admin' },
              { id: 'usr_02', email: 'sarah@company.com', role: 'engineer' },
              { id: 'usr_03', email: 'jinay@company.com', role: 'architect' },
            ],
            cursor: 'eyJpZCI6InVzcl8wMyJ9',
          }
        : {
            error: finalText,
            code: finalCode,
            message: isRateLimited
              ? 'Too Many Requests. Limit: 100/min'
              : isJwtExpired
              ? 'Authorization token has expired. Please refresh credentials.'
              : 'Isolated script exceeded max 200ms processing threshold.',
            timestamp: '2026-11-14T17:40:00.000Z',
          },
    },
  };
}

function resolveOrdersScenario(
  isRateLimited: boolean,
  isJwtExpired: boolean,
  isSandboxTimedOut: boolean,
  isDbSlow: boolean
): ResolvedScenario {
  const dbMs = isDbSlow ? 168 : 18;

  const stageTrigger: DemoStageDef = {
    id: 'trigger',
    name: '1. HTTP Trigger',
    shortName: 'Trigger',
    desc: 'Incoming POST request on checkout route',
    icon: 'Globe',
    color: '#6366f1',
    durationMs: 700,
    status: isRateLimited ? 'error' : 'ok',
    log: isRateLimited
      ? '[Gateway] 429 Too Many Requests - IP rate limit exceeded'
      : '[Gateway] POST /api/v1/orders',
    latencyMs: 1.1,
    payload: {
      config: { route: '/api/v1/orders', method: 'POST', bodyLimit: '2MB' },
      input: {
        method: 'POST',
        path: '/api/v1/orders',
        body: {
          items: [{ sku: 'PRO-SEAT-1YR', qty: 2, price: 49.99 }],
          currency: 'USD',
          paymentMethod: 'pm_card_visa',
        },
      },
    },
  };

  const stageAuth: DemoStageDef = {
    id: 'auth',
    name: '2. Auth Guard',
    shortName: 'Auth Guard',
    desc: 'Verify customer session & Stripe token',
    icon: 'Lock',
    color: '#a78bfa',
    durationMs: 650,
    status: isRateLimited ? 'skipped' : isJwtExpired ? 'error' : 'ok',
    log: isRateLimited
      ? '[Auth] Skipped'
      : isJwtExpired
      ? '[Auth] ERROR: 401 Unauthorized - customer token expired'
      : '[Auth] Validated Bearer JWT (role: verified_buyer, customer: cus_8912)',
    latencyMs: 1.4,
    payload: {
      config: { scopes: ['orders:create', 'payments:charge'], mfaRequired: false },
      output: isJwtExpired
        ? { error: 'token_expired' }
        : { customerId: 'cus_8912', email: 'buyer@example.com', verified: true },
    },
  };

  const stageSandbox: DemoStageDef = {
    id: 'sandbox',
    name: '3. JS Sandbox',
    shortName: 'JS Sandbox',
    desc: 'Calculate sales tax, discounts & validate SKUs',
    icon: 'Cpu',
    color: '#f59e0b',
    durationMs: isSandboxTimedOut ? 900 : 750,
    status: isRateLimited || isJwtExpired ? 'skipped' : isSandboxTimedOut ? 'error' : 'ok',
    log: isRateLimited || isJwtExpired
      ? '[Sandbox] Skipped'
      : isSandboxTimedOut
      ? '[Sandbox] ERROR: Script exceeded 200ms CPU isolation ceiling'
      : '[Sandbox] Validated order item schema & computed total: $99.98 (took 3.1ms)',
    latencyMs: isSandboxTimedOut ? 203.2 : 3.1,
    payload: {
      codeSnippet: `export default async function validateOrder({ items, currency }) {\n  const subtotal = items.reduce((s, i) => s + (i.price * i.qty), 0);\n  const tax = subtotal * 0.0825;\n  return { subtotal, tax, grandTotal: subtotal + tax };\n}`,
      output: isSandboxTimedOut
        ? { error: 'TIMEOUT' }
        : { subtotal: 99.98, tax: 8.25, grandTotal: 108.23 },
    },
  };

  const stageDb: DemoStageDef = {
    id: 'db',
    name: '4. Neon DB',
    shortName: 'Neon Postgres',
    desc: 'PostgreSQL ACID transaction: create order & deduct inventory',
    icon: 'Database',
    color: '#38bdf8',
    durationMs: isDbSlow ? 1150 : 800,
    status: isRateLimited || isJwtExpired || isSandboxTimedOut ? 'skipped' : 'ok',
    log: isRateLimited || isJwtExpired || isSandboxTimedOut
      ? '[Prisma] Skipped'
      : `[Prisma] BEGIN TRANSACTION; INSERT INTO "Order"... COMMIT (took ${dbMs}ms)`,
    latencyMs: dbMs,
    payload: {
      output: {
        transaction: 'tx_9981248',
        tables: ['Order', 'OrderItem', 'InventoryAudit'],
        committed: true,
      },
    },
  };

  const stageResponse: DemoStageDef = {
    id: 'response',
    name: '5. Response',
    shortName: 'Fastify Output',
    desc: 'Return HTTP 201 Created with order receipt',
    icon: 'CheckCircle',
    color: '#10b981',
    durationMs: 650,
    status: isRateLimited || isJwtExpired || isSandboxTimedOut ? 'skipped' : 'ok',
    log: isRateLimited
      ? '[Response] 429 Too Many Requests returned'
      : isJwtExpired
      ? '[Response] 401 Unauthorized returned'
      : isSandboxTimedOut
      ? '[Response] 504 Gateway Timeout returned'
      : '[Response] 201 Created - order_id: ord_9871f (took 22ms)',
    latencyMs: 0.5,
    payload: {
      output: { statusCode: 201, orderId: 'ord_9871f' },
    },
  };

  const stages = [stageTrigger, stageAuth, stageSandbox, stageDb, stageResponse];
  let finalCode = 201;
  let finalText = 'Created';
  let success = true;

  if (isRateLimited) {
    finalCode = 429;
    finalText = 'Too Many Requests';
    success = false;
  } else if (isJwtExpired) {
    finalCode = 401;
    finalText = 'Unauthorized';
    success = false;
  } else if (isSandboxTimedOut) {
    finalCode = 504;
    finalText = 'Gateway Timeout';
    success = false;
  }

  const activeLatencyStages = stages.filter(s => s.status === 'ok' || s.status === 'error');
  const totalLatency = Number(
    activeLatencyStages.reduce((acc, curr) => acc + curr.latencyMs, 0).toFixed(1)
  );

  return {
    id: 'orders',
    title: 'POST /api/v1/orders',
    method: 'POST',
    path: '/api/v1/orders',
    stages,
    totalLatencyMs: totalLatency,
    totalDurationMs: stages.reduce((acc, s) => acc + s.durationMs, 0),
    finalStatus: { code: finalCode, text: finalText, success },
    finalResponse: {
      statusCode: finalCode,
      headers: {
        'content-type': 'application/json',
        'x-order-id': 'ord_9871f',
        'x-jbsnap-latency': `${totalLatency}ms`,
      },
      body: success
        ? {
            orderId: 'ord_9871f',
            status: 'confirmed',
            amount: 108.23,
            currency: 'USD',
            paymentStatus: 'succeeded',
            receiptUrl: 'https://jbsnap.app/receipts/ord_9871f',
          }
        : { error: finalText, code: finalCode },
    },
  };
}

function resolveReportsScenario(
  isRateLimited: boolean,
  isJwtExpired: boolean,
  isSandboxTimedOut: boolean,
  isDbSlow: boolean
): ResolvedScenario {
  const dbMs = isDbSlow ? 210 : 38;

  const stageTrigger: DemoStageDef = {
    id: 'trigger',
    name: '1. HTTP Trigger',
    shortName: 'Trigger',
    desc: 'Incoming GET request for aggregate telemetry analytics',
    icon: 'Globe',
    color: '#6366f1',
    durationMs: 700,
    status: isRateLimited ? 'error' : 'ok',
    log: isRateLimited
      ? '[Gateway] 429 Too Many Requests - IP rate limit exceeded'
      : '[Gateway] GET /api/v1/reports?period=30d&aggregate=hourly',
    latencyMs: 1.0,
    payload: {
      config: { route: '/api/v1/reports', method: 'GET', cached: 'CDN Edge S-MaxAge 300' },
      input: { path: '/api/v1/reports', query: { period: '30d', aggregate: 'hourly' } },
    },
  };

  const stageAuth: DemoStageDef = {
    id: 'auth',
    name: '2. Auth Guard',
    shortName: 'Auth Guard',
    desc: 'Verify API Key with analytics:read scope',
    icon: 'Lock',
    color: '#a78bfa',
    durationMs: 650,
    status: isRateLimited ? 'skipped' : isJwtExpired ? 'error' : 'ok',
    log: isRateLimited
      ? '[Auth] Skipped'
      : isJwtExpired
      ? '[Auth] ERROR: 401 Unauthorized - API key revoked or expired'
      : '[Auth] Validated API Key (scope: analytics:read, team: Enterprise)',
    latencyMs: 1.2,
    payload: {
      config: { authType: 'Bearer / ApiKey', scopeRequired: 'analytics:read' },
    },
  };

  const stageSandbox: DemoStageDef = {
    id: 'sandbox',
    name: '3. JS Sandbox',
    shortName: 'JS Sandbox',
    desc: 'Format time-series bucket matrices & calculate percentiles',
    icon: 'Cpu',
    color: '#f59e0b',
    durationMs: isSandboxTimedOut ? 900 : 800,
    status: isRateLimited || isJwtExpired ? 'skipped' : isSandboxTimedOut ? 'error' : 'ok',
    log: isRateLimited || isJwtExpired
      ? '[Sandbox] Skipped'
      : isSandboxTimedOut
      ? '[Sandbox] ERROR: Script exceeded 200ms CPU isolation ceiling'
      : '[Sandbox] Aggregation transform computed across 120,000 data points (took 4.8ms)',
    latencyMs: isSandboxTimedOut ? 204.0 : 4.8,
    payload: {
      codeSnippet: `export default async function aggregate({ rows }) {\n  return rows.map(r => ({\n    timestamp: r.hour,\n    p50: r.p50_latency,\n    p99: r.p99_latency,\n    requests: Number(r.req_count)\n  }));\n}`,
    },
  };

  const stageDb: DemoStageDef = {
    id: 'db',
    name: '4. Neon DB',
    shortName: 'Neon Postgres',
    desc: 'Complex analytical SQL aggregation query with GROUP BY',
    icon: 'Database',
    color: '#38bdf8',
    durationMs: isDbSlow ? 1200 : 900,
    status: isRateLimited || isJwtExpired || isSandboxTimedOut ? 'skipped' : 'ok',
    log: isRateLimited || isJwtExpired || isSandboxTimedOut
      ? '[Prisma] Skipped'
      : `[Prisma] SELECT date_trunc('hour', created_at), count(*), avg(ms) FROM "Log" GROUP BY 1 (took ${dbMs}ms)`,
    latencyMs: dbMs,
    payload: {
      output: {
        queryType: 'Analytical Aggregation',
        rowsScanned: 120000,
        rowsReturned: 720,
        cacheStatus: 'HIT (in-memory buffer)',
      },
    },
  };

  const stageResponse: DemoStageDef = {
    id: 'response',
    name: '5. Response',
    shortName: 'Fastify Output',
    desc: 'Serialize JSON stream with brotli compression',
    icon: 'CheckCircle',
    color: '#10b981',
    durationMs: 650,
    status: isRateLimited || isJwtExpired || isSandboxTimedOut ? 'skipped' : 'ok',
    log: isRateLimited
      ? '[Response] 429 Too Many Requests returned'
      : isJwtExpired
      ? '[Response] 401 Unauthorized returned'
      : isSandboxTimedOut
      ? '[Response] 504 Gateway Timeout returned'
      : '[Response] 200 OK returned - brotli compressed 48.2KB',
    latencyMs: 0.6,
    payload: {
      output: { statusCode: 200, payloadSize: '48.2KB', compressionRatio: '4.2x' },
    },
  };

  const stages = [stageTrigger, stageAuth, stageSandbox, stageDb, stageResponse];
  let finalCode = 200;
  let finalText = 'OK';
  let success = true;

  if (isRateLimited) {
    finalCode = 429;
    finalText = 'Too Many Requests';
    success = false;
  } else if (isJwtExpired) {
    finalCode = 401;
    finalText = 'Unauthorized';
    success = false;
  } else if (isSandboxTimedOut) {
    finalCode = 504;
    finalText = 'Gateway Timeout';
    success = false;
  }

  const activeLatencyStages = stages.filter(s => s.status === 'ok' || s.status === 'error');
  const totalLatency = Number(
    activeLatencyStages.reduce((acc, curr) => acc + curr.latencyMs, 0).toFixed(1)
  );

  return {
    id: 'reports',
    title: 'GET /api/v1/reports',
    method: 'GET',
    path: '/api/v1/reports',
    stages,
    totalLatencyMs: totalLatency,
    totalDurationMs: stages.reduce((acc, s) => acc + s.durationMs, 0),
    finalStatus: { code: finalCode, text: finalText, success },
    finalResponse: {
      statusCode: finalCode,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=300, s-maxage=300',
        'content-encoding': 'br',
      },
      body: success
        ? {
            report: '30_day_hourly_telemetry',
            generatedAt: '2026-11-14T17:40:00.000Z',
            dataPoints: 720,
            summary: {
              avgLatencyMs: 14.2,
              p99LatencyMs: 38.6,
              errorRate: '0.002%',
              uptime: '99.99%',
            },
          }
        : { error: finalText, code: finalCode },
    },
  };
}
