# Installation Clipboard Experience - Design Document

📋 **Decision Context**: [ADR-021: Installation Clipboard Experience](../../../docs/architecture/decisions/021-installation-clipboard-experience.md)

## Overview

This feature improves copy/paste UX for Windows users during installation and daily use by:
1. Adding paste instructions before password prompts in the setup wizard
2. Auto-copying the login code to clipboard on startup
3. Displaying the login code with visual emphasis
4. Saving the login code to a file for backup reference

**Affected Components**:
- `packages/setup/` - CLI setup wizard (paste instructions)
- `installer/scripts/ngaj-start.ps1` - Windows startup script (clipboard, display, file)
- `installer/scripts/ngaj-start.sh` - macOS startup script (clipboard, display, file)
- `installer/scripts/ngaj-setup.ps1` - Windows setup script (clipboard, display, file)

---

## 1. Paste Instructions (Setup Wizard)

### 1.1 Location

Display paste instructions in the setup wizard **before each password/hidden input prompt**.

**Affected Files**:
- `packages/setup/src/prompts/anthropic.ts` - Before Anthropic API key prompt
- `packages/setup/src/prompts/bluesky.ts` - Before Bluesky app password prompt

### 1.2 Implementation

Create a utility function for consistent paste instructions:

```typescript
// packages/setup/src/utils/paste-instructions.ts

/**
 * Display paste instructions for terminal users.
 * Called before password/hidden input prompts.
 */
export function showPasteInstructions(): void {
  console.log('');
  console.log('📋 Tip: To paste in this terminal:');
  console.log('   • Windows Terminal: Right-click or Ctrl+Shift+V');
  console.log('   • PowerShell: Right-click');
  console.log('');
}
```

### 1.3 Integration Points

**anthropic.ts** - Before API key prompt:

```typescript
import { showPasteInstructions } from '../utils/paste-instructions.js';

export async function promptAnthropicCredentials(): Promise<AnthropicCredentials> {
  while (true) {
    showPasteInstructions();  // <-- Add here
    
    const answers = await inquirer.prompt([
      {
        type: 'password',
        name: 'apiKey',
        message: 'Anthropic API key:',
        mask: '*',
        // ... validation
      },
    ]);
    // ... rest of function
  }
}
```

**bluesky.ts** - Before app password prompt:

```typescript
import { showPasteInstructions } from '../utils/paste-instructions.js';

export async function promptBlueskyCredentials(): Promise<BlueskyCredentials> {
  while (true) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'handle',
        message: 'Your Bluesky handle (e.g., @yourname.bsky.social):',
        // ... validation (no paste instructions needed for text input)
      },
    ]);
    
    showPasteInstructions();  // <-- Add here, before password prompt
    
    const passwordAnswer = await inquirer.prompt([
      {
        type: 'password',
        name: 'appPassword',
        message: 'Bluesky app password:',
        mask: '*',
        // ... validation
      },
    ]);
    // ... rest of function
  }
}
```

**Note**: Bluesky credentials use two prompts - the handle is a text input (no paste instructions needed), but the app password is hidden (needs paste instructions).

---

## 2. Auto-Clipboard (Login Code)

### 2.1 Windows Implementation (PowerShell)

**File**: `installer/scripts/ngaj-start.ps1`

```powershell
# After reading login secret from .env
if ($loginSecret) {
    # Copy to clipboard
    $loginSecret | Set-Clipboard
    $clipboardSuccess = $true
}
```

**File**: `installer/scripts/ngaj-setup.ps1`

Same implementation after reading login secret.

### 2.2 macOS Implementation (bash)

**File**: `installer/scripts/ngaj-start.sh`

```bash
# After reading LOGIN_SECRET from .env
if [ -n "$LOGIN_SECRET" ]; then
    # Copy to clipboard (macOS)
    if command -v pbcopy &> /dev/null; then
        echo -n "$LOGIN_SECRET" | pbcopy
        CLIPBOARD_SUCCESS=true
    fi
fi
```

### 2.3 Error Handling

- If clipboard command fails, continue without error (graceful degradation)
- Set a flag to conditionally show "Copied to clipboard" message
- Don't block startup on clipboard failure

---

## 3. Visual Emphasis (Login Code Display)

### 3.1 Display Format

Use simple horizontal lines for emphasis (Option B from design discussion):

```
═══════════════════════════════════════
  LOGIN CODE:  A1B2-C3D4-E5F6-G7H8
═══════════════════════════════════════
  ✓ Copied to clipboard
```

### 3.2 Windows Implementation (PowerShell)

**File**: `installer/scripts/ngaj-start.ps1` and `installer/scripts/ngaj-setup.ps1`

```powershell
if ($loginSecret) {
    # Copy to clipboard
    $loginSecret | Set-Clipboard
    
    # Display with emphasis
    Write-Host ""
    Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  LOGIN CODE:  $loginSecret" -ForegroundColor Yellow
    Write-Host "═══════════════════════════════════════" -ForegroundColor Yellow
    Write-Host "  ✓ Copied to clipboard" -ForegroundColor Green
    Write-Host ""
    Write-Host "  (Use this code to log in from any device on your WiFi)"
}
```

### 3.3 macOS Implementation (bash)

**File**: `installer/scripts/ngaj-start.sh`

```bash
if [ -n "$LOGIN_SECRET" ]; then
    # Copy to clipboard
    CLIPBOARD_MSG=""
    if command -v pbcopy &> /dev/null; then
        echo -n "$LOGIN_SECRET" | pbcopy
        CLIPBOARD_MSG="  ${GREEN}✓ Copied to clipboard${NC}"
    fi
    
    # Display with emphasis
    echo ""
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    echo -e "${YELLOW}  LOGIN CODE:  ${LOGIN_SECRET}${NC}"
    echo -e "${YELLOW}═══════════════════════════════════════${NC}"
    if [ -n "$CLIPBOARD_MSG" ]; then
        echo -e "$CLIPBOARD_MSG"
    fi
    echo ""
    echo "  (Use this code to log in from any device on your WiFi)"
fi
```

---

## 4. File Backup (Login Code)

### 4.1 Purpose

Save login code to a file for:
- Easy reference if terminal is closed
- Alternative access method if clipboard fails
- Mobile device access (user can browse to file)

### 4.2 File Location

| OS | Path |
|----|------|
| macOS | `~/.ngaj/login-code.txt` |
| Windows | `%LOCALAPPDATA%\ngaj\login-code.txt` |

### 4.3 Windows Implementation (PowerShell)

```powershell
if ($loginSecret) {
    # Save to file
    $loginCodeFile = "$NgajHome\login-code.txt"
    $loginSecret | Out-File -FilePath $loginCodeFile -Encoding ASCII -NoNewline
    
    # ... display code ...
    
    Write-Host "  Login code also saved to: $loginCodeFile" -ForegroundColor DarkGray
}
```

### 4.4 macOS Implementation (bash)

```bash
if [ -n "$LOGIN_SECRET" ]; then
    # Save to file
    LOGIN_CODE_FILE="${NGAJ_HOME}/login-code.txt"
    echo -n "$LOGIN_SECRET" > "$LOGIN_CODE_FILE"
    
    # ... display code ...
    
    echo -e "  ${NC}Login code also saved to: $LOGIN_CODE_FILE"
fi
```

### 4.5 Security Consideration

The login code file contains the same value as `.env` (`LOGIN_SECRET`), so no additional security exposure. File permissions should match `.env` (user-only read/write).

---

## 5. Complete Terminal Output Examples

### 5.1 Setup Wizard (Paste Instructions)

```
📋 Tip: To paste in this terminal:
   • Windows Terminal: Right-click or Ctrl+Shift+V
   • PowerShell: Right-click

? Anthropic API key: ****************************

Validating Claude API connection...
✓ Connection successful
```

### 5.2 Startup Script (Login Code Display)

**With network available:**

```
=======================================
        ngaj is running!
=======================================

  Dashboard:    http://192.168.1.42:3000
  (localhost):  http://localhost:3000

═══════════════════════════════════════
  LOGIN CODE:  A1B2-C3D4-E5F6-G7H8
═══════════════════════════════════════
  ✓ Copied to clipboard

  (Use this code to log in from any device on your WiFi)
  Login code also saved to: ~/.ngaj/login-code.txt

Press Ctrl+C to stop ngaj
```

**Without network:**

```
=======================================
        ngaj is running!
=======================================

  Dashboard:    http://localhost:3000

═══════════════════════════════════════
  LOGIN CODE:  A1B2-C3D4-E5F6-G7H8
═══════════════════════════════════════
  ✓ Copied to clipboard

  (Use this code to log in from any device on your WiFi)
  Login code also saved to: ~/.ngaj/login-code.txt

Press Ctrl+C to stop ngaj
```

---

## 6. Edge Cases

### 6.1 Clipboard Unavailable

**Scenario**: `pbcopy` not available (non-standard macOS) or `Set-Clipboard` fails

**Handling**: Skip clipboard operation silently, omit "Copied to clipboard" message

### 6.2 No Login Secret in .env

**Scenario**: `.env` exists but `LOGIN_SECRET` is missing or empty

**Handling**: Skip login code display entirely (existing behavior preserved)

### 6.3 File Write Failure

**Scenario**: Cannot write to `login-code.txt` (permissions, disk full)

**Handling**: Log warning, continue without file backup, clipboard still works

### 6.4 Retry Loop in Setup Wizard

**Scenario**: User enters invalid credentials, wizard re-prompts

**Handling**: Paste instructions shown before each prompt (per design requirement)

---

## 7. Files to Modify

| File | Change |
|------|--------|
| `packages/setup/src/utils/paste-instructions.ts` | **New file** - Paste instructions utility |
| `packages/setup/src/prompts/anthropic.ts` | Add `showPasteInstructions()` call |
| `packages/setup/src/prompts/bluesky.ts` | Add `showPasteInstructions()` call |
| `installer/scripts/ngaj-start.ps1` | Add clipboard, visual emphasis, file save |
| `installer/scripts/ngaj-setup.ps1` | Add clipboard, visual emphasis, file save |
| `installer/scripts/ngaj-start.sh` | Add clipboard, visual emphasis, file save |

---

## 8. References

- **Decision Rationale**: [ADR-021](../../../docs/architecture/decisions/021-installation-clipboard-experience.md)
- **Test Guidance**: [Handoff Document](../handoffs/018-installation-clipboard-experience-handoff.md)
- **Parent Feature**: [ADR-011: Installation and Setup](../../../docs/architecture/decisions/011-installation-and-setup.md)
- **Related**: [010-network-access-display-handoff.md](../handoffs/010-network-access-display-handoff.md) - Terminal output formatting
