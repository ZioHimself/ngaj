# Installation Clipboard Experience - Test-Writer Handoff

🔗 **Design Rationale**: [ADR-021: Installation Clipboard Experience](../../../docs/architecture/decisions/021-installation-clipboard-experience.md)
🔗 **Technical Specs**: [Design Document](../designs/installation-clipboard-experience-design.md)

## Overview

This feature improves copy/paste UX during installation and daily use:
1. Paste instructions before password prompts (setup wizard)
2. Auto-copy login code to clipboard (startup scripts)
3. Visual emphasis for login code display
4. File backup of login code

---

## 1. Test Scope

### In Scope
- ✅ Paste instructions display before password prompts
- ✅ Clipboard auto-copy on Windows (`Set-Clipboard`)
- ✅ Clipboard auto-copy on macOS (`pbcopy`)
- ✅ Visual emphasis formatting for login code
- ✅ Login code file save
- ✅ Graceful degradation when clipboard unavailable

### Out of Scope
- ❌ GUI-based credential input
- ❌ File-based credential input (excluded from scope)
- ❌ Clipboard functionality on Linux (v0.2)

---

## 2. Test Scenarios

### 2.1 Unit Tests: Paste Instructions Utility

See [Design Doc Section 1](../designs/installation-clipboard-experience-design.md#1-paste-instructions-setup-wizard) for implementation.

#### Scenario 2.1.1: Show Paste Instructions

**Given**: Setup wizard running in terminal
**When**: `showPasteInstructions()` is called
**Then**: Paste instructions are printed to stdout

**Acceptance Criteria**:
- [ ] Output includes "📋 Tip: To paste in this terminal:"
- [ ] Output includes Windows Terminal instructions (Right-click or Ctrl+Shift+V)
- [ ] Output includes PowerShell instructions (Right-click)
- [ ] Output has blank line before and after for visual separation

**Expected Output**:
```

📋 Tip: To paste in this terminal:
   • Windows Terminal: Right-click or Ctrl+Shift+V
   • PowerShell: Right-click

```

---

### 2.2 Integration Tests: Anthropic Prompt Flow

#### Scenario 2.2.1: Paste Instructions Before API Key Prompt

**Given**: Setup wizard at Anthropic credentials step
**When**: User reaches API key prompt
**Then**: Paste instructions appear before the prompt

**Acceptance Criteria**:
- [ ] Paste instructions shown immediately before "Anthropic API key:" prompt
- [ ] Instructions appear on first attempt
- [ ] Instructions appear on retry after validation failure

---

### 2.3 Integration Tests: Bluesky Prompt Flow

#### Scenario 2.3.1: Paste Instructions Before App Password Only

**Given**: Setup wizard at Bluesky credentials step
**When**: User enters handle and proceeds to app password
**Then**: Paste instructions appear before password prompt only

**Acceptance Criteria**:
- [ ] No paste instructions before handle prompt (text input, not password)
- [ ] Paste instructions shown before app password prompt
- [ ] Instructions appear on retry after validation failure

---

### 2.4 Unit Tests: Clipboard Operations (Windows)

#### Scenario 2.4.1: Login Code Copied to Clipboard

**Given**: Windows startup script running, `$loginSecret` has value
**When**: Login code display section executes
**Then**: Login code is copied to system clipboard

**Acceptance Criteria**:
- [ ] `Set-Clipboard` called with login secret value
- [ ] "✓ Copied to clipboard" message displayed
- [ ] Clipboard contains exact login code value (no extra whitespace)

**Mock/Verification**:
```powershell
# Verify clipboard content
$clipboardContent = Get-Clipboard
$clipboardContent | Should -Be $expectedLoginSecret
```

---

#### Scenario 2.4.2: Clipboard Failure Handled Gracefully

**Given**: `Set-Clipboard` fails (e.g., in headless environment)
**When**: Clipboard operation attempted
**Then**: Script continues without error

**Acceptance Criteria**:
- [ ] No script termination on clipboard failure
- [ ] "Copied to clipboard" message NOT shown if clipboard failed
- [ ] Login code still displayed in terminal
- [ ] File backup still written

---

### 2.5 Unit Tests: Clipboard Operations (macOS)

#### Scenario 2.5.1: Login Code Copied with pbcopy

**Given**: macOS startup script running, `$LOGIN_SECRET` has value
**When**: Login code display section executes
**Then**: Login code is copied via `pbcopy`

**Acceptance Criteria**:
- [ ] `pbcopy` command executed with login secret piped in
- [ ] "✓ Copied to clipboard" message displayed
- [ ] No trailing newline in clipboard (use `echo -n`)

---

#### Scenario 2.5.2: pbcopy Unavailable

**Given**: `pbcopy` not found in PATH
**When**: Clipboard operation attempted
**Then**: Script continues without error

**Acceptance Criteria**:
- [ ] `command -v pbcopy` check fails
- [ ] No clipboard copy attempted
- [ ] "Copied to clipboard" message NOT shown
- [ ] Login code still displayed
- [ ] File backup still written

---

### 2.6 Integration Tests: Visual Emphasis Display

#### Scenario 2.6.1: Login Code Displayed with Emphasis Box

**Given**: Startup script running, login secret available
**When**: Login code display section executes
**Then**: Login code appears with visual emphasis

**Acceptance Criteria**:
- [ ] Horizontal line above login code (═══════)
- [ ] Login code text formatted as "LOGIN CODE:  {value}"
- [ ] Horizontal line below login code
- [ ] Yellow color applied (Windows: `-ForegroundColor Yellow`, macOS: ANSI)
- [ ] "✓ Copied to clipboard" in green below the box

**Expected Format**:
```
═══════════════════════════════════════
  LOGIN CODE:  A1B2-C3D4-E5F6-G7H8
═══════════════════════════════════════
  ✓ Copied to clipboard
```

---

#### Scenario 2.6.2: Display Without Clipboard Success

**Given**: Clipboard operation failed or unavailable
**When**: Login code display section executes
**Then**: Display omits clipboard message

**Acceptance Criteria**:
- [ ] Emphasis box still shown
- [ ] Login code still visible
- [ ] "Copied to clipboard" line NOT present
- [ ] No error messages shown

---

### 2.7 Integration Tests: File Backup

#### Scenario 2.7.1: Login Code Saved to File (Windows)

**Given**: Windows startup script, login secret available
**When**: Login code display section executes
**Then**: Login code saved to file

**Acceptance Criteria**:
- [ ] File created at `%LOCALAPPDATA%\ngaj\login-code.txt`
- [ ] File contains exact login code (no extra whitespace/newlines)
- [ ] File path displayed in terminal output
- [ ] ASCII encoding used

**Verification**:
```powershell
$content = Get-Content "$env:LOCALAPPDATA\ngaj\login-code.txt" -Raw
$content | Should -Be $expectedLoginSecret
```

---

#### Scenario 2.7.2: Login Code Saved to File (macOS)

**Given**: macOS startup script, login secret available
**When**: Login code display section executes
**Then**: Login code saved to file

**Acceptance Criteria**:
- [ ] File created at `~/.ngaj/login-code.txt`
- [ ] File contains exact login code (no trailing newline)
- [ ] File path displayed in terminal output

---

#### Scenario 2.7.3: File Write Failure

**Given**: Target directory not writable
**When**: File save attempted
**Then**: Script continues without error

**Acceptance Criteria**:
- [ ] Warning logged (optional)
- [ ] No script termination
- [ ] Clipboard and display still work
- [ ] File path message NOT shown if write failed

---

### 2.8 Edge Cases

#### Scenario 2.8.1: Empty Login Secret

**Given**: `.env` exists but `LOGIN_SECRET` is empty or missing
**When**: Startup script runs
**Then**: Login code section skipped entirely

**Acceptance Criteria**:
- [ ] No emphasis box displayed
- [ ] No clipboard operation attempted
- [ ] No file save attempted
- [ ] No error messages

---

#### Scenario 2.8.2: Retry Loop Shows Instructions Each Time

**Given**: User enters invalid API key, wizard prompts for retry
**When**: User reaches password prompt again
**Then**: Paste instructions shown again

**Acceptance Criteria**:
- [ ] Instructions appear before first prompt
- [ ] Instructions appear before each retry prompt
- [ ] Consistent format each time

---

## 3. Test Data and Fixtures

### 3.1 Test Login Codes

```typescript
const TEST_LOGIN_CODES = {
  standard: 'A1B2-C3D4-E5F6-G7H8',
  withNumbers: 'X9Y8-Z7W6-V5U4-T3S2',
  short: 'ABCD-EFGH',  // Edge case if format changes
};
```

### 3.2 Test Paths

```typescript
// Windows
const WINDOWS_LOGIN_CODE_PATH = process.env.LOCALAPPDATA + '\\ngaj\\login-code.txt';

// macOS
const MACOS_LOGIN_CODE_PATH = process.env.HOME + '/.ngaj/login-code.txt';
```

---

## 4. Test Environment Setup

### 4.1 Unit Tests (Paste Instructions)

- Mock `console.log` to capture output
- No external dependencies

### 4.2 Integration Tests (Setup Wizard)

- Mock inquirer prompts
- Capture stdout for paste instructions verification
- No actual credential validation needed

### 4.3 Integration Tests (Startup Scripts)

**Windows**:
- Run in PowerShell environment
- Mock or verify `Set-Clipboard`
- Mock `.env` file with test login secret

**macOS**:
- Run in bash environment
- Mock or verify `pbcopy`
- Mock `.env` file with test login secret

---

## 5. Test Priorities

### Critical Path (Must Pass) - Automated Tests
1. ✅ Paste instructions shown before Anthropic API key prompt → `tests/integration/setup/paste-instructions-flow.spec.ts`
2. ✅ Paste instructions shown before Bluesky app password prompt → `tests/integration/setup/paste-instructions-flow.spec.ts`
3. ✅ Login code displayed with visual emphasis → `tests/unit/launcher/login-code-emphasis.spec.ts`
4. ✅ Instructions shown on retry prompts → `tests/integration/setup/paste-instructions-flow.spec.ts`
5. ✅ Empty login secret handling → `tests/unit/launcher/login-code-emphasis.spec.ts`

### Manual Testing Required (Shell Script Functionality)
6. 🔧 Login code copied to clipboard (Windows) - Manual: Run `ngaj-start.ps1`, verify clipboard content
7. 🔧 Login code copied to clipboard (macOS) - Manual: Run `ngaj-start.sh`, verify clipboard content
8. 🔧 Login code saved to file (Windows) - Manual: Check `%LOCALAPPDATA%\ngaj\login-code.txt`
9. 🔧 Login code saved to file (macOS) - Manual: Check `~/.ngaj/login-code.txt`
10. 🔧 Graceful degradation when clipboard unavailable - Manual: Test in headless environment

### Nice-to-Have (Can Defer)
11. ⚠️ File write failure handling - Manual edge case testing

---

## 6. Acceptance Criteria Summary

Installation Clipboard Experience succeeds when:

1. ✅ Paste instructions appear before each password prompt in setup wizard
2. ✅ Login code auto-copied to clipboard on Windows startup
3. ✅ Login code auto-copied to clipboard on macOS startup
4. ✅ Login code displayed with simple emphasis box format
5. ✅ Login code saved to file for backup reference
6. ✅ Clipboard failure handled gracefully (no crash)
7. ✅ File path shown in terminal output
8. ✅ Instructions repeat on retry after validation failure

---

## 7. Test Files Created

| Test File | Type | Coverage |
|-----------|------|----------|
| `tests/unit/setup/utils/paste-instructions.spec.ts` | Unit | Paste instructions utility output |
| `tests/unit/launcher/login-code-emphasis.spec.ts` | Unit | Visual emphasis formatting |
| `tests/integration/setup/paste-instructions-flow.spec.ts` | Integration | Prompt flow integration |
| `tests/fixtures/setup-fixtures.ts` | Fixtures | Added paste instructions patterns |
| `tests/fixtures/launcher-fixtures.ts` | Fixtures | Added emphasis output patterns |

---

## References

- [Design Document](../designs/installation-clipboard-experience-design.md) - Complete implementation specs
- [ADR-021](../../../docs/architecture/decisions/021-installation-clipboard-experience.md) - Decision rationale
- [010-network-access-display-handoff.md](./010-network-access-display-handoff.md) - Related terminal output tests
