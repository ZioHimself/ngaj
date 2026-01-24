# Network Access Display - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-011: Installation and Setup Architecture](../../../../docs/architecture/decisions/011-installation-and-setup.md) (Section 6)
🔗 **Technical Specs**: [Design Document](../designs/installation-setup-design.md) (Section 6)

## Overview

Network Access Display detects and displays the host machine's LAN IP address after backend startup, enabling users to access the ngaj dashboard from mobile devices on the same WiFi network. This is a sub-feature of the installation and setup system.

**Key Behavior**: After services start successfully, the post-install script detects the host's LAN IP and displays it in the terminal alongside the localhost URL.

---

## 1. Test Scope

### In Scope
- ✅ LAN IP detection on macOS (WiFi, Ethernet fallback)
- ✅ LAN IP detection on Windows (WiFi, Ethernet fallback)
- ✅ Graceful handling when no network available
- ✅ Terminal output formatting
- ✅ Integration with post-install script flow

### Out of Scope (v0.1)
- ❌ Web UI display of network URL (deferred to v0.2)
- ❌ QR code generation (deferred to v0.2)
- ❌ Multiple IP selection UI (show first valid IP only)

---

## 2. Test Scenarios

### 2.1 Unit Tests: LAN IP Detection (macOS)

See [Design Doc Section 6.2](../designs/installation-setup-design.md#62-implementation-v01---terminal-only) for implementation.

#### Scenario 2.1.1: WiFi Connected (en0)

**Given**: macOS system with WiFi connected (interface en0)
**When**: `detect_lan_ip` function runs
**Then**: Returns valid WiFi IP address

**Acceptance Criteria**:
- [ ] Detects IP from `en0` interface using `ipconfig getifaddr en0`
- [ ] Returns IPv4 address (e.g., `192.168.1.x`)
- [ ] Does not return localhost (`127.x.x.x`)

---

#### Scenario 2.1.2: Ethernet Only (en1 Fallback)

**Given**: macOS system with Ethernet only (no WiFi)
**When**: `detect_lan_ip` function runs
**Then**: Falls back to Ethernet interface

**Acceptance Criteria**:
- [ ] Tries `en0` first, returns empty
- [ ] Tries `en1`, succeeds
- [ ] Returns valid IPv4 address

---

#### Scenario 2.1.3: No Network Interfaces

**Given**: macOS system with no active network connections
**When**: `detect_lan_ip` function runs
**Then**: Returns empty string

**Acceptance Criteria**:
- [ ] All interface checks return empty
- [ ] Function returns empty string (not error)
- [ ] No exception thrown

---

### 2.2 Unit Tests: LAN IP Detection (Windows)

#### Scenario 2.2.1: WiFi Connected

**Given**: Windows system with WiFi connected
**When**: `Get-LanIP` function runs
**Then**: Returns WiFi IP address

**Acceptance Criteria**:
- [ ] Queries `Get-NetIPAddress -AddressFamily IPv4`
- [ ] Filters for DHCP or Manual prefix origin
- [ ] Excludes localhost addresses (`127.*`)
- [ ] Excludes APIPA addresses (`169.254.*`)
- [ ] Prefers WiFi interface (`*Wi-Fi*`) over Ethernet

---

#### Scenario 2.2.2: Ethernet Only

**Given**: Windows system with Ethernet only
**When**: `Get-LanIP` function runs
**Then**: Returns Ethernet IP address

**Acceptance Criteria**:
- [ ] No WiFi interface found
- [ ] Falls back to Ethernet interface (`*Ethernet*`)
- [ ] Returns valid IPv4 address

---

#### Scenario 2.2.3: No Network Interfaces

**Given**: Windows system with no active network connections
**When**: `Get-LanIP` function runs
**Then**: Returns null/empty

**Acceptance Criteria**:
- [ ] `Get-NetIPAddress` returns no valid addresses
- [ ] Function returns null or empty string
- [ ] No exception thrown

---

### 2.3 Unit Tests: Edge Cases

#### Scenario 2.3.1: VPN Active

**Given**: System with VPN connected (e.g., `10.8.0.x` IP)
**When**: LAN IP detection runs
**Then**: May return VPN IP (acceptable behavior)

**Acceptance Criteria**:
- [ ] Returns valid IP (could be VPN IP like `10.x.x.x`)
- [ ] Detection completes without error
- [ ] Note: VPN IP may or may not be accessible from mobile - this is expected and acceptable

---

#### Scenario 2.3.2: Multiple Network Interfaces

**Given**: System with both WiFi and Ethernet connected
**When**: LAN IP detection runs
**Then**: Returns WiFi IP (preferred)

**Acceptance Criteria**:
- [ ] WiFi takes precedence over Ethernet
- [ ] Returns single IP (not multiple)

---

### 2.4 Integration Tests: Terminal Output

#### Scenario 2.4.1: Display with Network Available

**Given**: Services started successfully, LAN IP detected as `192.168.1.42`
**When**: Post-install script completes
**Then**: Terminal displays both local and network URLs

**Acceptance Criteria**:
- [ ] Shows `✓ Backend running`
- [ ] Shows `Local access:   http://localhost:3000`
- [ ] Shows `Network access: http://192.168.1.42:3000`
- [ ] Shows hint: `(Use this URL from your mobile device on the same WiFi)`

**Expected Output**:
```
✓ Backend running

  Local access:   http://localhost:3000
  Network access: http://192.168.1.42:3000
  (Use this URL from your mobile device on the same WiFi)
```

---

#### Scenario 2.4.2: Display without Network

**Given**: Services started successfully, no LAN IP detected
**When**: Post-install script completes
**Then**: Terminal displays localhost only (no network URL)

**Acceptance Criteria**:
- [ ] Shows `✓ Backend running`
- [ ] Shows `Local access:   http://localhost:3000`
- [ ] Network access line is NOT displayed
- [ ] No error message shown
- [ ] Graceful degradation

**Expected Output**:
```
✓ Backend running

  Local access:   http://localhost:3000
```

---

#### Scenario 2.4.3: Output Runs on Every Backend Start

**Given**: Backend restarted (not fresh install)
**When**: Services become healthy
**Then**: LAN IP re-detected and displayed

**Acceptance Criteria**:
- [ ] IP detection runs on every start (not just initial install)
- [ ] Handles IP changes between runs (DHCP)
- [ ] Display format consistent with initial install

---

### 2.5 Integration Tests: Combined with Auth Display

See [009-simple-token-auth-handoff.md](./009-simple-token-auth-handoff.md) for auth-specific tests.

#### Scenario 2.5.1: Full Terminal Output (Network + Auth)

**Given**: Services started, LAN IP detected, LOGIN_SECRET in `.env`
**When**: Post-install script completes
**Then**: Terminal displays URLs and login code

**Acceptance Criteria**:
- [ ] Network access URL displayed before login code
- [ ] Proper spacing between sections
- [ ] All hints displayed correctly

**Expected Output**:
```
✓ Backend running

  Local access:   http://localhost:3000
  Network access: http://192.168.1.42:3000
  (Use this URL from your mobile device on the same WiFi)

  Login code: A1B2-C3D4-E5F6-G7H8
  (Enter this code when prompted in your browser)
```

---

## 3. Test Data and Fixtures

### 3.1 Mock IP Addresses

```bash
# Valid LAN IPs
MOCK_WIFI_IP="192.168.1.42"
MOCK_ETHERNET_IP="192.168.1.100"
MOCK_VPN_IP="10.8.0.5"

# Invalid/excluded IPs
MOCK_LOCALHOST="127.0.0.1"
MOCK_APIPA="169.254.1.1"
```

### 3.2 Mock Commands (macOS)

```bash
# Mock successful WiFi detection
mock_ipconfig_getifaddr_en0() {
  echo "192.168.1.42"
}

# Mock no WiFi, successful Ethernet
mock_ipconfig_getifaddr_en0_fail() {
  return 1
}
mock_ipconfig_getifaddr_en1() {
  echo "192.168.1.100"
}

# Mock no network
mock_ipconfig_getifaddr_all_fail() {
  return 1
}
```

### 3.3 Mock Commands (Windows)

```powershell
# Mock Get-NetIPAddress results
$MockWiFiAddress = @{
    IPAddress = "192.168.1.42"
    InterfaceAlias = "Wi-Fi"
    PrefixOrigin = "Dhcp"
}

$MockEthernetAddress = @{
    IPAddress = "192.168.1.100"
    InterfaceAlias = "Ethernet"
    PrefixOrigin = "Manual"
}
```

---

## 4. Test Environment Setup

### 4.1 Unit Tests

- Mock `ipconfig` (macOS) and `Get-NetIPAddress` (Windows)
- No actual network interfaces required
- Test detection logic in isolation

### 4.2 Integration Tests

- Actual network interfaces (or Docker network simulation)
- Full post-install script execution
- Verify terminal output format

---

## 5. Priority and Test Coverage

### Critical Path (Must Pass)
- ✅ LAN IP detection returns valid IP when network available
- ✅ Graceful handling when no network (no crash, no error)
- ✅ Terminal output displays network URL correctly

### Important (Should Pass)
- ✅ WiFi preferred over Ethernet
- ✅ APIPA addresses excluded
- ✅ Localhost addresses excluded
- ✅ Runs on every backend start

### Nice-to-Have (Can Defer)
- ⚠️ VPN IP handling (acceptable to show VPN IP)
- ⚠️ Multiple interface selection (show first valid)

---

## 6. Acceptance Criteria Summary

Network Access Display succeeds when:

1. ✅ LAN IP detected on macOS (WiFi or Ethernet)
2. ✅ LAN IP detected on Windows (WiFi or Ethernet)
3. ✅ Graceful fallback when no network (localhost only)
4. ✅ Invalid IPs excluded (localhost, APIPA)
5. ✅ Network URL displayed in terminal with correct format
6. ✅ Detection runs on every backend start
7. ✅ No errors when network unavailable

---

## References

- [Design Document Section 6](../designs/installation-setup-design.md#6-network-access-display) - Implementation details
- [ADR-011: Installation and Setup](../../../../docs/architecture/decisions/011-installation-and-setup.md) - Architecture context
- [009-simple-token-auth-handoff.md](./009-simple-token-auth-handoff.md) - Related auth feature (login code display)
