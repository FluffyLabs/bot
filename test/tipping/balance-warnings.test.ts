import { describe, it, expect } from 'vitest';
import { checkBalanceWarnings, type BalanceResult } from '../../src/tipping/blockchain.js';

describe('Balance Warnings', () => {
  describe('checkBalanceWarnings', () => {
    it('should return no warnings when both balances are sufficient', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(1000 * 10_000_000_000), // 1000 DOT
        usdcBalance: BigInt(5000 * 1_000_000), // 5000 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // max 10 DOT, 100 USDC
      // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(0);
    });

    it('should return DOT warning when DOT balance is below threshold', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(50 * 10_000_000_000), // 50 DOT
        usdcBalance: BigInt(5000 * 1_000_000), // 5000 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // max 10 DOT, 100 USDC
      // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        asset: 'DOT',
        currentBalance: 50,
        threshold: 100,
        maxTipAmount: 10,
      });
    });

    it('should return USDC warning when USDC balance is below threshold', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(1000 * 10_000_000_000), // 1000 DOT
        usdcBalance: BigInt(500 * 1_000_000), // 500 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // max 10 DOT, 100 USDC
      // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({
        asset: 'USDC',
        currentBalance: 500,
        threshold: 1000,
        maxTipAmount: 100,
      });
    });

    it('should return both warnings when both balances are below thresholds', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(25 * 10_000_000_000), // 25 DOT
        usdcBalance: BigInt(250 * 1_000_000), // 250 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // max 10 DOT, 100 USDC
      // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning).toEqual({
        asset: 'DOT',
        currentBalance: 25,
        threshold: 100,
        maxTipAmount: 10,
      });

      expect(usdcWarning).toEqual({
        asset: 'USDC',
        currentBalance: 250,
        threshold: 1000,
        maxTipAmount: 100,
      });
    });

    it('should return no warnings when balance check failed', () => {
      const balanceResult: BalanceResult = {
        dotBalance: 0n,
        usdcBalance: 0n,
        success: false,
        error: 'Failed to connect to blockchain',
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100);

      expect(warnings).toHaveLength(0);
    });

    it('should handle exact threshold values correctly', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(100 * 10_000_000_000), // Exactly 100 DOT (threshold)
        usdcBalance: BigInt(1000 * 1_000_000), // Exactly 1000 USDC (threshold)
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // max 10 DOT, 100 USDC
      // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(0); // Exactly at threshold should not warn
    });

    it('should handle very small amounts correctly', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(1), // 1 planck (very small)
        usdcBalance: BigInt(1), // 1 micro-USDC (very small)
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 1, 1); // max 1 DOT, 1 USDC
      // Thresholds: 10 DOT, 10 USDC

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning?.currentBalance).toBeCloseTo(0.0000000001); // Very small DOT amount
      expect(usdcWarning?.currentBalance).toBeCloseTo(0.000001); // Very small USDC amount
    });

    it('should handle different max tip amounts correctly', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(5 * 10_000_000_000), // 5 DOT
        usdcBalance: BigInt(50 * 1_000_000), // 50 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 1, 10); // max 1 DOT, 10 USDC
      // Thresholds: 10 DOT, 100 USDC

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning).toEqual({
        asset: 'DOT',
        currentBalance: 5,
        threshold: 10,
        maxTipAmount: 1,
      });

      expect(usdcWarning).toEqual({
        asset: 'USDC',
        currentBalance: 50,
        threshold: 100,
        maxTipAmount: 10,
      });
    });

    it('should handle zero balances', () => {
      const balanceResult: BalanceResult = {
        dotBalance: 0n,
        usdcBalance: 0n,
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100);

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning?.currentBalance).toBe(0);
      expect(usdcWarning?.currentBalance).toBe(0);
    });

    it('should handle fractional amounts correctly', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(Math.floor(12.345 * 10_000_000_000)), // 12.345 DOT
        usdcBalance: BigInt(Math.floor(123.456 * 1_000_000)), // 123.456 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 5, 50); // max 5 DOT, 50 USDC
      // Thresholds: 50 DOT, 500 USDC

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning?.currentBalance).toBeCloseTo(12.345, 3);
      expect(usdcWarning?.currentBalance).toBeCloseTo(123.456, 3);
    });

    it('should work with high max tip amounts', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(500 * 10_000_000_000), // 500 DOT
        usdcBalance: BigInt(5000 * 1_000_000), // 5000 USDC
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 100, 1000); // max 100 DOT, 1000 USDC
      // Thresholds: 1000 DOT, 10000 USDC

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning?.threshold).toBe(1000);
      expect(usdcWarning?.threshold).toBe(10000);
    });
  });

  describe('Balance warning integration scenarios', () => {
    it('should calculate correct thresholds based on 10x multiplier', () => {
      const testCases = [
        { maxDot: 1, maxUsdc: 10, expectedDotThreshold: 10, expectedUsdcThreshold: 100 },
        { maxDot: 5, maxUsdc: 25, expectedDotThreshold: 50, expectedUsdcThreshold: 250 },
        { maxDot: 0.1, maxUsdc: 1, expectedDotThreshold: 1, expectedUsdcThreshold: 10 },
        { maxDot: 100, maxUsdc: 1000, expectedDotThreshold: 1000, expectedUsdcThreshold: 10000 },
      ];

      testCases.forEach(({ maxDot, maxUsdc, expectedDotThreshold, expectedUsdcThreshold }) => {
        const balanceResult: BalanceResult = {
          dotBalance: 0n, // Zero balance to trigger warnings
          usdcBalance: 0n,
          success: true,
        };

        const warnings = checkBalanceWarnings(balanceResult, maxDot, maxUsdc);

        expect(warnings).toHaveLength(2);
        
        const dotWarning = warnings.find(w => w.asset === 'DOT');
        const usdcWarning = warnings.find(w => w.asset === 'USDC');

        expect(dotWarning?.threshold).toBe(expectedDotThreshold);
        expect(dotWarning?.maxTipAmount).toBe(maxDot);
        expect(usdcWarning?.threshold).toBe(expectedUsdcThreshold);
        expect(usdcWarning?.maxTipAmount).toBe(maxUsdc);
      });
    });

    it('should handle edge case where balance is just above threshold', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(Math.floor(100.1 * 10_000_000_000)), // 100.1 DOT (just above 100 threshold)
        usdcBalance: BigInt(Math.floor(1000.1 * 1_000_000)), // 1000.1 USDC (just above 1000 threshold)
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(0);
    });

    it('should handle edge case where balance is just below threshold', () => {
      const balanceResult: BalanceResult = {
        dotBalance: BigInt(Math.floor(99.9 * 10_000_000_000)), // 99.9 DOT (just below 100 threshold)
        usdcBalance: BigInt(Math.floor(999.9 * 1_000_000)), // 999.9 USDC (just below 1000 threshold)
        success: true,
      };

      const warnings = checkBalanceWarnings(balanceResult, 10, 100); // Thresholds: 100 DOT, 1000 USDC

      expect(warnings).toHaveLength(2);
      
      const dotWarning = warnings.find(w => w.asset === 'DOT');
      const usdcWarning = warnings.find(w => w.asset === 'USDC');

      expect(dotWarning?.currentBalance).toBeCloseTo(99.9, 1);
      expect(usdcWarning?.currentBalance).toBeCloseTo(999.9, 1);
    });
  });
});