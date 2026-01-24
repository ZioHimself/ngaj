/**
 * Terminal Output Integration Tests (Red Phase)
 *
 * Tests for terminal output formatting during application startup.
 * Validates the display of network URLs, login codes, and status messages.
 *
 * @see ADR-011: Installation and Setup Architecture (Sections 6 and 7)
 * @see 010-network-access-display-handoff.md (Section 2.4)
 * @see 012-application-launcher-handoff.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validLanIPs,
  loginSecretMocks,
  terminalOutputPatterns,
  terminalOutputExamples,
  envFileMocks,
} from '@tests/fixtures/launcher-fixtures';
import {
  formatStatusDisplay,
  formatNetworkAccessDisplay,
  formatLoginCodeDisplay,
  createTerminalOutput,
} from '@ngaj/setup/utils/terminal-output.js';

describe('Terminal Output Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // Network Access Display Tests (Section 2.4)
  // ==========================================================================

  describe('formatNetworkAccessDisplay()', () => {
    describe('Scenario 2.4.1: Display with Network Available', () => {
      it('should show "Backend running" checkmark', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: validLanIPs.wifiIP,
          port: 3000,
        });

        expect(output).toContain(terminalOutputPatterns.backendRunning);
      });

      it('should show local access URL', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: validLanIPs.wifiIP,
          port: 3000,
        });

        expect(output).toMatch(terminalOutputPatterns.localAccess);
      });

      it('should show network access URL with detected IP', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: validLanIPs.wifiIP,
          port: 3000,
        });

        expect(output).toContain(`http://${validLanIPs.wifiIP}:3000`);
      });

      it('should show mobile hint message', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: validLanIPs.wifiIP,
          port: 3000,
        });

        expect(output).toContain(terminalOutputPatterns.mobileHint);
      });

      it('should format output exactly as specified', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '192.168.1.42',
          port: 3000,
        });

        expect(output).toBe(terminalOutputExamples.withNetwork);
      });
    });

    describe('Scenario 2.4.2: Display without Network', () => {
      it('should show "Backend running" checkmark', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '',
          port: 3000,
        });

        expect(output).toContain(terminalOutputPatterns.backendRunning);
      });

      it('should show local access URL only', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '',
          port: 3000,
        });

        expect(output).toMatch(terminalOutputPatterns.localAccess);
      });

      it('should NOT show network access URL', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '',
          port: 3000,
        });

        expect(output).not.toMatch(/Network access:/);
      });

      it('should NOT show mobile hint', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '',
          port: 3000,
        });

        expect(output).not.toContain(terminalOutputPatterns.mobileHint);
      });

      it('should NOT show error message', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '',
          port: 3000,
        });

        expect(output.toLowerCase()).not.toContain('error');
      });

      it('should format output exactly as specified for localhost only', () => {
        const output = formatNetworkAccessDisplay({
          lanIP: '',
          port: 3000,
        });

        expect(output).toBe(terminalOutputExamples.withoutNetwork);
      });
    });

    describe('Scenario 2.4.3: Output Runs on Every Backend Start', () => {
      it('should produce consistent output format on repeated calls', () => {
        const output1 = formatNetworkAccessDisplay({ lanIP: validLanIPs.wifiIP, port: 3000 });
        const output2 = formatNetworkAccessDisplay({ lanIP: validLanIPs.wifiIP, port: 3000 });

        expect(output1).toBe(output2);
      });

      it('should handle IP changes between runs', () => {
        const output1 = formatNetworkAccessDisplay({ lanIP: validLanIPs.wifiIP, port: 3000 });
        const output2 = formatNetworkAccessDisplay({ lanIP: validLanIPs.ethernetIP, port: 3000 });

        expect(output1).toContain(validLanIPs.wifiIP);
        expect(output2).toContain(validLanIPs.ethernetIP);
      });
    });
  });

  // ==========================================================================
  // Combined Network + Auth Display Tests (Section 2.5)
  // ==========================================================================

  describe('formatStatusDisplay() - Full Terminal Output', () => {
    describe('Scenario 2.5.1: Full Terminal Output (Network + Auth)', () => {
      it('should show network access URL before login code', () => {
        const output = formatStatusDisplay({
          lanIP: validLanIPs.wifiIP,
          loginCode: loginSecretMocks.valid,
          port: 3000,
        });

        const networkIndex = output.indexOf('Network access');
        const loginIndex = output.indexOf('Login code');

        expect(networkIndex).toBeLessThan(loginIndex);
      });

      it('should have proper spacing between sections', () => {
        const output = formatStatusDisplay({
          lanIP: validLanIPs.wifiIP,
          loginCode: loginSecretMocks.valid,
          port: 3000,
        });

        // Should have empty line between network section and login section
        expect(output).toMatch(/WiFi\)[\r\n]+[\r\n]+\s+Login code/);
      });

      it('should display all hints correctly', () => {
        const output = formatStatusDisplay({
          lanIP: validLanIPs.wifiIP,
          loginCode: loginSecretMocks.valid,
          port: 3000,
        });

        expect(output).toContain(terminalOutputPatterns.mobileHint);
        expect(output).toContain('Enter this code when prompted');
      });

      it('should format output exactly as specified', () => {
        const output = formatStatusDisplay({
          lanIP: '192.168.1.42',
          loginCode: 'A1B2-C3D4-E5F6-G7H8',
          port: 3000,
        });

        expect(output).toBe(terminalOutputExamples.fullWithLoginCode);
      });
    });

    describe('Output without Login Code', () => {
      it('should show network section without login code section', () => {
        const output = formatStatusDisplay({
          lanIP: validLanIPs.wifiIP,
          loginCode: '',
          port: 3000,
        });

        expect(output).toContain('Network access');
        expect(output).not.toContain('Login code');
      });
    });

    describe('Output without Network but with Login Code', () => {
      it('should show localhost and login code only', () => {
        const output = formatStatusDisplay({
          lanIP: '',
          loginCode: loginSecretMocks.valid,
          port: 3000,
        });

        expect(output).toContain('Local access');
        expect(output).not.toContain('Network access');
        expect(output).toContain('Login code');
      });
    });
  });

  // ==========================================================================
  // formatLoginCodeDisplay Tests
  // ==========================================================================

  describe('formatLoginCodeDisplay()', () => {
    it('should display login code in correct format', () => {
      const output = formatLoginCodeDisplay(loginSecretMocks.valid);

      expect(output).toContain(`Login code: ${loginSecretMocks.valid}`);
    });

    it('should include browser hint', () => {
      const output = formatLoginCodeDisplay(loginSecretMocks.valid);

      expect(output).toContain('Enter this code when prompted in your browser');
    });

    it('should return empty string for empty login code', () => {
      const output = formatLoginCodeDisplay('');

      expect(output).toBe('');
    });

    it('should match expected pattern format', () => {
      const output = formatLoginCodeDisplay(loginSecretMocks.valid);

      expect(output).toMatch(terminalOutputPatterns.loginCode);
    });
  });

  // ==========================================================================
  // createTerminalOutput Tests (Factory Function)
  // ==========================================================================

  describe('createTerminalOutput()', () => {
    it('should create complete terminal output with all components', async () => {
      const mockGetLanIP = vi.fn().mockResolvedValue(validLanIPs.wifiIP);
      const mockReadLoginCode = vi.fn().mockResolvedValue({
        success: true,
        loginCode: loginSecretMocks.valid,
      });

      const output = await createTerminalOutput({
        getLanIP: mockGetLanIP,
        readLoginCode: mockReadLoginCode,
        port: 3000,
      });

      expect(output).toContain(terminalOutputPatterns.backendRunning);
      expect(output).toContain(`http://${validLanIPs.wifiIP}:3000`);
      expect(output).toContain(loginSecretMocks.valid);
    });

    it('should handle network detection failure gracefully', async () => {
      const mockGetLanIP = vi.fn().mockResolvedValue('');
      const mockReadLoginCode = vi.fn().mockResolvedValue({
        success: true,
        loginCode: loginSecretMocks.valid,
      });

      const output = await createTerminalOutput({
        getLanIP: mockGetLanIP,
        readLoginCode: mockReadLoginCode,
        port: 3000,
      });

      expect(output).toContain('localhost:3000');
      expect(output).not.toContain('Network access');
      expect(output).toContain(loginSecretMocks.valid);
    });

    it('should handle login code read failure gracefully', async () => {
      const mockGetLanIP = vi.fn().mockResolvedValue(validLanIPs.wifiIP);
      const mockReadLoginCode = vi.fn().mockResolvedValue({
        success: false,
        loginCode: '',
      });

      const output = await createTerminalOutput({
        getLanIP: mockGetLanIP,
        readLoginCode: mockReadLoginCode,
        port: 3000,
      });

      expect(output).toContain(`http://${validLanIPs.wifiIP}:3000`);
      expect(output).not.toContain('Login code');
    });
  });

  // ==========================================================================
  // Cold Start Output Tests
  // ==========================================================================

  describe('Cold Start Terminal Output', () => {
    it('should show startup messages in correct order', () => {
      const messages = [
        '🚀 Starting ngaj...',
        'Starting Docker Desktop...',
        'Waiting for Docker daemon...',
        '✓ Docker is ready',
        'Waiting for services...',
        '✓ Backend running',
      ];

      // This tests the expected message sequence during cold start
      for (let i = 0; i < messages.length - 1; i++) {
        const currentIndex = terminalOutputExamples.coldStart.indexOf(messages[i]);
        const nextIndex = terminalOutputExamples.coldStart.indexOf(messages[i + 1]);

        if (currentIndex !== -1 && nextIndex !== -1) {
          expect(currentIndex).toBeLessThan(nextIndex);
        }
      }
    });

    it('should include Ctrl+C instruction', () => {
      expect(terminalOutputExamples.coldStart).toContain('Press Ctrl+C to stop ngaj');
    });

    it('should show dashboard URL', () => {
      expect(terminalOutputExamples.coldStart).toMatch(/Dashboard:\s+http:\/\//);
    });
  });

  // ==========================================================================
  // Edge Cases
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle custom port numbers', () => {
      const output = formatNetworkAccessDisplay({
        lanIP: validLanIPs.wifiIP,
        port: 8080,
      });

      expect(output).toContain('http://localhost:8080');
      expect(output).toContain(`http://${validLanIPs.wifiIP}:8080`);
    });

    it('should escape special characters in IP addresses', () => {
      // IPv4 addresses should not need escaping, but test for robustness
      const output = formatNetworkAccessDisplay({
        lanIP: '192.168.1.1',
        port: 3000,
      });

      expect(output).toContain('http://192.168.1.1:3000');
    });

    it('should handle very long login codes gracefully', () => {
      const longCode = 'ABCD-EFGH-IJKL-MNOP-QRST-UVWX';
      const output = formatLoginCodeDisplay(longCode);

      expect(output).toContain(longCode);
    });

    it('should handle whitespace-only login code as empty', () => {
      const output = formatLoginCodeDisplay('   ');

      expect(output).toBe('');
    });
  });
});
