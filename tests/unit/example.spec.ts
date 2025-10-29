import { describe, it, expect } from 'vitest';

// @requirement: EX-001
describe('Example Test Suite', () => {
  it('should pass', () => {
    expect(true).toBe(true);
  });

  it('should demonstrate testing', () => {
    const sum = (a: number, b: number) => a + b;
    expect(sum(2, 3)).toBe(5);
  });
});
