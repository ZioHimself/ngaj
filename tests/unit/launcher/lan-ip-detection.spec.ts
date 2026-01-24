/**
 * LAN IP Detection Tests (Red Phase)
 *
 * Tests for network access display IP detection logic.
 * These tests validate the IP detection and filtering logic that runs
 * during application startup to display network URLs.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 6)
 * @see 010-network-access-display-handoff.md
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  validLanIPs,
  invalidIPs,
  macOSInterfaceMocks,
  windowsInterfaceMocks,
} from '@tests/fixtures/launcher-fixtures';
import {
  detectLanIP,
  isValidLanIP,
  filterInvalidIPs,
  preferWiFiOverEthernet,
} from '@ngaj/setup/utils/lan-ip-detection.js';

describe('LAN IP Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // IP Validation Tests
  // ==========================================================================

  describe('isValidLanIP()', () => {
    describe('valid LAN IPs', () => {
      it('should return true for valid WiFi IP (192.168.x.x)', () => {
        expect(isValidLanIP(validLanIPs.wifiIP)).toBe(true);
      });

      it('should return true for valid Ethernet IP', () => {
        expect(isValidLanIP(validLanIPs.ethernetIP)).toBe(true);
      });

      it('should return true for VPN IP (10.x.x.x)', () => {
        expect(isValidLanIP(validLanIPs.vpnIP)).toBe(true);
      });

      it('should return true for corporate network IP (10.0.x.x)', () => {
        expect(isValidLanIP(validLanIPs.corporateNetwork)).toBe(true);
      });
    });

    describe('invalid IPs (should be excluded)', () => {
      it('should return false for localhost (127.0.0.1)', () => {
        expect(isValidLanIP(invalidIPs.localhost)).toBe(false);
      });

      it('should return false for alternate localhost (127.0.0.2)', () => {
        expect(isValidLanIP(invalidIPs.localhostAlternate)).toBe(false);
      });

      it('should return false for APIPA address (169.254.x.x)', () => {
        expect(isValidLanIP(invalidIPs.apipa)).toBe(false);
      });

      it('should return false for alternate APIPA address', () => {
        expect(isValidLanIP(invalidIPs.apipaAlternate)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(isValidLanIP('')).toBe(false);
      });

      it('should return false for null', () => {
        expect(isValidLanIP(null as unknown as string)).toBe(false);
      });

      it('should return false for undefined', () => {
        expect(isValidLanIP(undefined as unknown as string)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // IP Filtering Tests
  // ==========================================================================

  describe('filterInvalidIPs()', () => {
    it('should filter out localhost addresses', () => {
      const ips = [validLanIPs.wifiIP, invalidIPs.localhost, validLanIPs.ethernetIP];
      const result = filterInvalidIPs(ips);

      expect(result).toContain(validLanIPs.wifiIP);
      expect(result).toContain(validLanIPs.ethernetIP);
      expect(result).not.toContain(invalidIPs.localhost);
    });

    it('should filter out APIPA addresses', () => {
      const ips = [validLanIPs.wifiIP, invalidIPs.apipa];
      const result = filterInvalidIPs(ips);

      expect(result).toContain(validLanIPs.wifiIP);
      expect(result).not.toContain(invalidIPs.apipa);
    });

    it('should return empty array when all IPs are invalid', () => {
      const ips = [invalidIPs.localhost, invalidIPs.apipa];
      const result = filterInvalidIPs(ips);

      expect(result).toEqual([]);
    });

    it('should return all IPs when all are valid', () => {
      const ips = [validLanIPs.wifiIP, validLanIPs.ethernetIP, validLanIPs.vpnIP];
      const result = filterInvalidIPs(ips);

      expect(result).toHaveLength(3);
    });

    it('should handle empty input array', () => {
      const result = filterInvalidIPs([]);
      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // Interface Preference Tests
  // ==========================================================================

  describe('preferWiFiOverEthernet()', () => {
    it('should prefer WiFi when both WiFi and Ethernet are available', () => {
      const interfaces = [
        { ip: validLanIPs.ethernetIP, type: 'ethernet' as const },
        { ip: validLanIPs.wifiIP, type: 'wifi' as const },
      ];

      const result = preferWiFiOverEthernet(interfaces);

      expect(result).toBe(validLanIPs.wifiIP);
    });

    it('should return Ethernet IP when only Ethernet is available', () => {
      const interfaces = [{ ip: validLanIPs.ethernetIP, type: 'ethernet' as const }];

      const result = preferWiFiOverEthernet(interfaces);

      expect(result).toBe(validLanIPs.ethernetIP);
    });

    it('should return WiFi IP when only WiFi is available', () => {
      const interfaces = [{ ip: validLanIPs.wifiIP, type: 'wifi' as const }];

      const result = preferWiFiOverEthernet(interfaces);

      expect(result).toBe(validLanIPs.wifiIP);
    });

    it('should return null when no interfaces available', () => {
      const result = preferWiFiOverEthernet([]);

      expect(result).toBeNull();
    });
  });

  // ==========================================================================
  // macOS Detection Tests
  // ==========================================================================

  describe('detectLanIP() - macOS', () => {
    describe('Scenario 2.1.1: WiFi Connected (en0)', () => {
      it('should detect IP from en0 interface when WiFi connected', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.wifiConnected[iface as keyof typeof macOSInterfaceMocks.wifiConnected];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).toBe(validLanIPs.wifiIP);
        expect(mockGetInterfaceIP).toHaveBeenCalledWith('en0');
      });

      it('should return valid IPv4 address (not localhost)', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.wifiConnected[iface as keyof typeof macOSInterfaceMocks.wifiConnected];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).not.toBe('127.0.0.1');
        expect(result).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      });
    });

    describe('Scenario 2.1.2: Ethernet Only (en1 Fallback)', () => {
      it('should fall back to en1 when en0 returns empty', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.ethernetOnly[iface as keyof typeof macOSInterfaceMocks.ethernetOnly];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).toBe(validLanIPs.ethernetIP);
        expect(mockGetInterfaceIP).toHaveBeenCalledWith('en0');
        expect(mockGetInterfaceIP).toHaveBeenCalledWith('en1');
      });

      it('should return valid IPv4 address from Ethernet', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.ethernetOnly[iface as keyof typeof macOSInterfaceMocks.ethernetOnly];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).toMatch(/^192\.168\.\d{1,3}\.\d{1,3}$/);
      });
    });

    describe('Scenario 2.1.3: No Network Interfaces', () => {
      it('should return empty string when no interfaces available', async () => {
        const mockGetInterfaceIP = vi.fn().mockReturnValue(null);

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).toBe('');
      });

      it('should not throw exception when no network', async () => {
        const mockGetInterfaceIP = vi.fn().mockReturnValue(null);

        await expect(
          detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP })
        ).resolves.not.toThrow();
      });
    });

    describe('Scenario: VPN Active', () => {
      it('should return VPN IP when VPN is active (acceptable behavior)', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.vpnActive[iface as keyof typeof macOSInterfaceMocks.vpnActive];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).toBe(validLanIPs.vpnIP);
        // VPN IP like 10.x.x.x is valid and acceptable
        expect(result).toMatch(/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/);
      });
    });

    describe('Scenario: Multiple Network Interfaces', () => {
      it('should prefer WiFi (en0) over Ethernet (en1) when both available', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.bothConnected[iface as keyof typeof macOSInterfaceMocks.bothConnected];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(result).toBe(validLanIPs.wifiIP);
      });

      it('should return single IP (not multiple)', async () => {
        const mockGetInterfaceIP = vi.fn().mockImplementation((iface: string) => {
          return macOSInterfaceMocks.bothConnected[iface as keyof typeof macOSInterfaceMocks.bothConnected];
        });

        const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

        expect(typeof result).toBe('string');
        expect(result.includes(',')).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Windows Detection Tests
  // ==========================================================================

  describe('detectLanIP() - Windows', () => {
    describe('Scenario 2.2.1: WiFi Connected', () => {
      it('should return WiFi IP address when WiFi connected', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.wifiConnected);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).toBe(validLanIPs.wifiIP);
      });

      it('should filter out localhost addresses', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue([
          ...windowsInterfaceMocks.wifiConnected,
          { IPAddress: '127.0.0.1', InterfaceAlias: 'Loopback', PrefixOrigin: 'Manual' },
        ]);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).not.toBe('127.0.0.1');
        expect(result).toBe(validLanIPs.wifiIP);
      });
    });

    describe('Scenario 2.2.2: Ethernet Only', () => {
      it('should return Ethernet IP when no WiFi available', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.ethernetOnly);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).toBe(validLanIPs.ethernetIP);
      });
    });

    describe('Scenario 2.2.3: No Network Interfaces', () => {
      it('should return empty string when no network interfaces', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.noNetwork);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).toBe('');
      });

      it('should not throw exception when no network', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.noNetwork);

        await expect(
          detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses })
        ).resolves.not.toThrow();
      });
    });

    describe('Scenario: APIPA Only', () => {
      it('should return empty string when only APIPA addresses available', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.apipaOnly);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).toBe('');
      });
    });

    describe('Scenario: WiFi Preferred Over Ethernet', () => {
      it('should prefer WiFi over Ethernet when both available', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.bothConnected);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).toBe(validLanIPs.wifiIP);
      });
    });

    describe('Scenario: VPN Plus WiFi', () => {
      it('should prefer WiFi over VPN interface', async () => {
        const mockGetNetworkAddresses = vi.fn().mockReturnValue(windowsInterfaceMocks.vpnPlusWifi);

        const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

        expect(result).toBe(validLanIPs.wifiIP);
      });
    });
  });

  // ==========================================================================
  // Edge Case Tests
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle IPv6 addresses gracefully (filter them out)', async () => {
      const mockGetNetworkAddresses = vi.fn().mockReturnValue([
        { IPAddress: 'fe80::1', InterfaceAlias: 'Wi-Fi', PrefixOrigin: 'Dhcp' },
        { IPAddress: validLanIPs.wifiIP, InterfaceAlias: 'Wi-Fi', PrefixOrigin: 'Dhcp' },
      ]);

      const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

      expect(result).toBe(validLanIPs.wifiIP);
    });

    it('should handle network interface errors gracefully', async () => {
      const mockGetInterfaceIP = vi.fn().mockImplementation(() => {
        throw new Error('Network interface error');
      });

      const result = await detectLanIP({ platform: 'darwin', getInterfaceIP: mockGetInterfaceIP });

      expect(result).toBe('');
    });

    it('should handle malformed IP addresses', async () => {
      const mockGetNetworkAddresses = vi.fn().mockReturnValue([
        { IPAddress: 'not.an.ip', InterfaceAlias: 'Wi-Fi', PrefixOrigin: 'Dhcp' },
        { IPAddress: validLanIPs.wifiIP, InterfaceAlias: 'Wi-Fi', PrefixOrigin: 'Dhcp' },
      ]);

      const result = await detectLanIP({ platform: 'win32', getNetworkAddresses: mockGetNetworkAddresses });

      expect(result).toBe(validLanIPs.wifiIP);
    });
  });
});
