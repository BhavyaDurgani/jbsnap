import { describe, it, expect } from 'vitest';
import { runInSandbox } from '../services/sandbox.js';

describe('V8 VM Sandbox - Execution & Isolation', () => {
  it('should execute basic JavaScript calculation cleanly', async () => {
    const code = `
      result = {
        total: context.body.price * context.body.quantity,
        status: 'calculated'
      };
    `;
    const contextData = {
      body: { price: 25, quantity: 4 },
    };

    const res = runInSandbox(code, contextData);
    const data = res.data && typeof res.data.then === 'function' ? await res.data : res.data;
    expect(res.success).toBe(true);
    expect(data).toEqual({ total: 100, status: 'calculated' });
  });

  it('should enforce restricted keyword barriers (Anti-Escape)', () => {
    const escapePayloads = [
      'const p = this.constructor.constructor("return process")();',
      'Object.prototype.polluted = true;',
      'const x = __proto__;',
      'console.log(process.env);',
      'global.hacked = true;',
      'globalThis.leak = true;',
      'const fn = new Function("return 1");',
      'eval("1 + 1");',
      'import fs from "fs";',
    ];

    for (const payload of escapePayloads) {
      const res = runInSandbox(payload, {});
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/restricted execution keyword/i);
    }
  });

  it('should terminate infinite loops within the timeout ceiling', () => {
    const infiniteLoopCode = `
      while (true) {}
    `;

    const res = runInSandbox(infiniteLoopCode, {}, 200);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/timed out|timeout/i);
  });
});
