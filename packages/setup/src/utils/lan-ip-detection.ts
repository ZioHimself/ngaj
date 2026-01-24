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
 * Regular expression for valid IPv4 addresses
 */
const IPV4_REGEX = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/**
 * Check if an IP address is a valid LAN IP (not localhost or APIPA)
 *
 * @param ip - IP address to validate
 * @returns True if valid LAN IP, false otherwise
 */
export function isValidLanIP(ip: string): boolean {
  // Handle null, undefined, empty
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // Check if valid IPv4 format
  const match = ip.match(IPV4_REGEX);
  if (!match) {
    return false;
  }

  // Validate each octet is 0-255
  const octets = [match[1], match[2], match[3], match[4]].map(Number);
  if (octets.some((o) => o > 255)) {
    return false;
  }

  const firstOctet = octets[0];
  const secondOctet = octets[1];

  // Exclude localhost (127.x.x.x)
  if (firstOctet === 127) {
    return false;
  }

  // Exclude APIPA (169.254.x.x)
  if (firstOctet === 169 && secondOctet === 254) {
    return false;
  }

  return true;
}

/**
 * Filter out invalid IPs (localhost, APIPA) from a list
 *
 * @param ips - Array of IP addresses
 * @returns Array of valid LAN IPs
 */
export function filterInvalidIPs(ips: string[]): string[] {
  return ips.filter(isValidLanIP);
}

/**
 * Prefer WiFi interface over Ethernet when both are available
 *
 * @param interfaces - Array of network interfaces with type info
 * @returns Preferred IP address or null if none available
 */
export function preferWiFiOverEthernet(interfaces: NetworkInterface[]): string | null {
  if (interfaces.length === 0) {
    return null;
  }

  // Priority: wifi > ethernet > vpn > other
  const wifiInterface = interfaces.find((i) => i.type === 'wifi');
  if (wifiInterface) {
    return wifiInterface.ip;
  }

  const ethernetInterface = interfaces.find((i) => i.type === 'ethernet');
  if (ethernetInterface) {
    return ethernetInterface.ip;
  }

  const vpnInterface = interfaces.find((i) => i.type === 'vpn');
  if (vpnInterface) {
    return vpnInterface.ip;
  }

  // Return first available interface
  return interfaces[0]?.ip ?? null;
}

/**
 * Determine interface type from Windows interface alias
 */
function getWindowsInterfaceType(alias: string): NetworkInterface['type'] {
  const lowerAlias = alias.toLowerCase();
  if (lowerAlias.includes('wi-fi') || lowerAlias.includes('wifi')) {
    return 'wifi';
  }
  if (lowerAlias.includes('ethernet')) {
    return 'ethernet';
  }
  if (lowerAlias.includes('vpn')) {
    return 'vpn';
  }
  return 'other';
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
export async function detectLanIP(options: DetectLanIPOptions): Promise<string> {
  try {
    if (options.platform === 'darwin') {
      return detectLanIPMacOS(options);
    } else if (options.platform === 'win32') {
      return detectLanIPWindows(options);
    }
    // Linux or unsupported platform
    return '';
  } catch {
    // Gracefully handle any errors
    return '';
  }
}

/**
 * Detect LAN IP on macOS using ipconfig getifaddr
 */
function detectLanIPMacOS(options: DetectLanIPOptions): string {
  const { getInterfaceIP } = options;
  if (!getInterfaceIP) {
    return '';
  }

  // Try interfaces in order of preference: en0 (WiFi) then en1 (Ethernet)
  const interfaces = ['en0', 'en1'];
  const results: NetworkInterface[] = [];

  for (const iface of interfaces) {
    try {
      const ip = getInterfaceIP(iface);
      if (ip && isValidLanIP(ip)) {
        const type = iface === 'en0' ? 'wifi' : 'ethernet';
        results.push({ ip, type });
      }
    } catch {
      // Continue to next interface
    }
  }

  // Return preferred interface (WiFi over Ethernet)
  return preferWiFiOverEthernet(results) ?? '';
}

/**
 * Detect LAN IP on Windows using Get-NetIPAddress
 */
function detectLanIPWindows(options: DetectLanIPOptions): string {
  const { getNetworkAddresses } = options;
  if (!getNetworkAddresses) {
    return '';
  }

  try {
    const addresses = getNetworkAddresses();
    if (!addresses || addresses.length === 0) {
      return '';
    }

    // Convert to NetworkInterface format and filter invalid IPs
    const interfaces: NetworkInterface[] = addresses
      .filter((addr) => isValidLanIP(addr.IPAddress))
      .map((addr) => ({
        ip: addr.IPAddress,
        type: getWindowsInterfaceType(addr.InterfaceAlias),
      }));

    // Return preferred interface (WiFi over Ethernet)
    return preferWiFiOverEthernet(interfaces) ?? '';
  } catch {
    return '';
  }
}
