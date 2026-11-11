import { describe, it, expect } from 'vitest';
import { orderNodes, resolveVariable } from '../services/dag.js';

describe('DAG Engine - Kahn\'s BFS Topological Sort', () => {
  it('should correctly sequence linear nodes A -> B -> C', () => {
    const nodes = [
      { id: 'C', type: 'responseNode', data: {} },
      { id: 'A', type: 'requestNode', data: {} },
      { id: 'B', type: 'codeNode', data: {} },
    ];
    const edges = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
    ];

    const sorted = orderNodes(nodes, edges);
    expect(sorted.map((n) => n.id)).toEqual(['A', 'B', 'C']);
  });

  it('should sequence diamond branching DAGs without breaking dependencies', () => {
    // A -> B, A -> C, B -> D, C -> D
    const nodes = [
      { id: 'D', type: 'responseNode', data: {} },
      { id: 'B', type: 'codeNode', data: {} },
      { id: 'C', type: 'codeNode', data: {} },
      { id: 'A', type: 'requestNode', data: {} },
    ];
    const edges = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'A', target: 'C' },
      { id: 'e3', source: 'B', target: 'D' },
      { id: 'e4', source: 'C', target: 'D' },
    ];

    const sorted = orderNodes(nodes, edges);
    const order = sorted.map((n) => n.id);
    
    // A must be first
    expect(order[0]).toBe('A');
    // D must be last
    expect(order[3]).toBe('D');
    // Both B and C must be visited before D
    expect(order.indexOf('B')).toBeLessThan(order.indexOf('D'));
    expect(order.indexOf('C')).toBeLessThan(order.indexOf('D'));
  });

  it('should detect cycles and throw a circular dependency error', () => {
    // A -> B -> C -> A
    const nodes = [
      { id: 'A', type: 'codeNode', data: {} },
      { id: 'B', type: 'codeNode', data: {} },
      { id: 'C', type: 'codeNode', data: {} },
    ];
    const edges = [
      { id: 'e1', source: 'A', target: 'B' },
      { id: 'e2', source: 'B', target: 'C' },
      { id: 'e3', source: 'C', target: 'A' },
    ];

    expect(() => orderNodes(nodes, edges)).toThrow(/circular dependency/i);
  });
});

describe('Variable Resolver - Path & Security Tests', () => {
  it('should resolve deep nested properties', () => {
    const context = {
      request: {
        body: {
          user: {
            profile: {
              name: 'Alice',
            },
          },
        },
      },
    };

    expect(resolveVariable('request.body.user.profile.name', context)).toBe('Alice');
    expect(resolveVariable('request.body.user.nonexistent', context)).toBeUndefined();
    expect(resolveVariable('', context)).toBeUndefined();
  });

  it('should block prototype pollution traversal attacks', () => {
    const context = {
      safe: 'value',
    };

    expect(resolveVariable('__proto__.polluted', context)).toBeUndefined();
    expect(resolveVariable('constructor.prototype', context)).toBeUndefined();
    expect(resolveVariable('prototype.isAdmin', context)).toBeUndefined();
  });
});
