/**
 * LAN IP Detection Utilities
 *
 * Cross-platform utilities for detecting the host's LAN IP address.
 * Used by the application launcher to display network access URLs.
 *
 * @see ADR-011: Installation and Setup Architecture (Section 6)
 * @see 010-network-access-display-handoff.md
 */

/**
 * Network interface information for Windows
 */
export interface WindowsNetworkAddress {
  IPAddress: string;
  InterfaceAlias: string;
  PrefixOrigin: string;
}

/**
 * Network interface type for preference ordering
 */
export interface NetworkInterface {
  ip: string;
  type: 'wifi' | 'ethernet' | 'vpn' | 'other';
}

/**
 * Options for LAN IP detection
 */
export interface DetectLanIPOptions {
  /** Operating system platform */
  platform: 'darwin' | 'win32' | 'linux';
  /** Mock function for getting interface IP (macOS) */
  getInterfaceIP?: (iface: string) => string | null;
  /** Mock function for getting network addresses (Windows) */
  getNetworkAddresses?: () => WindowsNetworkAddress[];
}

/**
 * Check if an IP address is a valid LAN IP (not localhost or APIPA)
 *
 * @param ip - IP address to validate
 * @returns True if valid LAN IP, false otherwise
 */
export function isValidLanIP(_ip: string): boolean {
  throw new Error('Not implemented');
}

/**
 * Filter out invalid IPs (localhost, APIPA) from a list
 *
 * @param ips - Array of IP addresses
 * @returns Array of valid LAN IPs
 */
export function filterInvalidIPs(_ips: string[]): string[] {
  throw new Error('Not implemented');
}

/**
 * Prefer WiFi interface over Ethernet when both are available
 *
 * @param interfaces - Array of network interfaces with type info
 * @returns Preferred IP address or null if none available
 */
export function preferWiFiOverEthernet(_interfaces: NetworkInterface[]): string | null {
  throw new Error('Not implemented');
}

/**
 * Detect the host's LAN IP address
 *
 * Platform-specific detection:
 * - macOS: Uses `ipconfig getifaddr` for en0/en1 interfaces
 * - Windows: Uses Get-NetIPAddress PowerShell command
 *
 * Filtering rules:
 * - Excludes localhost (127.x.x.x)
 * - Excludes APIPA (169.254.x.x)
 * - Prefers WiFi over Ethernet
 *
 * @param options - Detection options including platform and mock functions
 * @returns LAN IP address or empty string if not available
 */
export async function detectLanIP(_options: DetectLanIPOptions): Promise<string> {
  throw new Error('Not implemented');
}
