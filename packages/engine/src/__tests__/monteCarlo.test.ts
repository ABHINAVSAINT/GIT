import { describe, it, expect } from 'vitest';
import { determineRequiredContribution } from '../monteCarlo.js';

describe('determineRequiredContribution', () => {
  it('returns positive contribution for known target', () => {
    const result = determineRequiredContribution(
      10000000, // ₹1 crore target
      500000,   // ₹5L current
      0.12,     // 12% expected return
      20,       // 20 years
    );
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(75000);
  });

  it('returns 0 for zero years', () => {
    const result = determineRequiredContribution(100000, 0, 0.1, 0);
    expect(result).toBe(0);
  });
});
