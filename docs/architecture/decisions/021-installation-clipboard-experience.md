# ADR-021: Installation Clipboard Experience

## Status

**Accepted** - February 5, 2026

## Context

Windows users experience friction with copy/paste operations during ngaj installation and daily use:

1. **Pasting credentials during setup**: The CLI setup wizard prompts for API keys and passwords, but PowerShell paste behavior varies by terminal configuration:
   - Legacy consoles require right-click paste
   - Windows Terminal supports Ctrl+Shift+V or right-click
   - Ctrl+V doesn't work in many configurations
   - No visual feedback with masked password inputs

2. **Copying login code after startup**: The login code displayed in terminal is needed for mobile device access, but:
   - Manual text selection in terminals is unintuitive
   - No clipboard integration exists
   - Users must manually transcribe codes

These issues create barriers for the non-technical target audience (ADR-005).

## Options Considered

### Option A: Paste Instructions + Manual Clipboard Copy

- Show paste instructions before prompts
- User manually selects and copies login code
- **Pros**: Minimal implementation
- **Cons**: Still requires manual clipboard interaction

### Option B: Paste Instructions + Auto-Clipboard + Visual Emphasis

- Show paste instructions before each password prompt
- Auto-copy login code to system clipboard on startup
- Display login code with visual emphasis (easy to spot)
- Save login code to file as backup reference
- **Pros**: Best UX, reduces friction significantly
- **Cons**: More implementation work

### Option C: GUI-based Credential Input

- Replace CLI wizard with GUI (Electron or native)
- Standard OS paste behavior (Ctrl+V/Cmd+V)
- **Pros**: Familiar UX
- **Cons**: Significantly larger installer, more complexity (rejected in ADR-011)

## Decision

We will implement **Option B**: Paste instructions + auto-clipboard + visual emphasis + file backup.

Specifically:
1. **Paste instructions**: Display before each password prompt in the setup wizard
2. **Auto-clipboard**: Copy login code to system clipboard on startup (Windows and macOS)
3. **Visual emphasis**: Display login code in a simple emphasis box format
4. **File backup**: Save login code to a file for easy reference

## Rationale

1. **Low implementation cost**: Clipboard APIs are built into PowerShell (`Set-Clipboard`) and bash (`pbcopy`)
2. **Non-invasive**: Enhances existing flows without architectural changes
3. **Addresses root cause**: Paste instructions educate users; auto-copy eliminates manual selection
4. **Cross-platform consistency**: Same experience on Windows and macOS
5. **Aligns with target audience**: Non-technical users benefit most from these affordances

## Consequences

### Positive

- ✅ Reduced friction for Windows users during credential entry
- ✅ One-click (actually zero-click) login code copying
- ✅ Visual prominence makes login code easy to find
- ✅ File backup provides fallback if clipboard fails
- ✅ Educational: paste instructions help users learn their terminal

### Negative

- ❌ Clipboard overwrites user's existing clipboard content (acceptable trade-off)
- ❌ Slightly more verbose terminal output (paste instructions)
- ❌ Login code file creates additional artifact to manage

### Mitigation

- **Clipboard overwrite**: Login code is small and easily re-copied; most users expect this behavior
- **Verbose output**: Instructions are brief (2 lines) and helpful
- **File artifact**: Placed in user data directory (`~/.ngaj/` or `%LOCALAPPDATA%\ngaj\`), mentioned in docs

## Implementation Notes

### Paste Instructions (Setup Wizard)

Display before each password/hidden input prompt:

```
📋 Tip: To paste in this terminal:
   • Windows Terminal: Right-click or Ctrl+Shift+V
   • PowerShell: Right-click
```

### Auto-Clipboard (Startup Scripts)

**Windows (PowerShell)**:
```powershell
$loginSecret | Set-Clipboard
```

**macOS (bash)**:
```bash
echo -n "$LOGIN_SECRET" | pbcopy
```

### Visual Emphasis (Login Code Display)

```
═══════════════════════════════════════
  LOGIN CODE:  A1B2-C3D4-E5F6-G7H8
═══════════════════════════════════════
  ✓ Copied to clipboard
```

### File Backup

Save to `~/.ngaj/login-code.txt` (macOS) or `%LOCALAPPDATA%\ngaj\login-code.txt` (Windows).

## Related Decisions

- [ADR-011: Installation and Setup Architecture](./011-installation-and-setup.md) - Parent feature
- [ADR-014: Simple Token Authentication](./014-simple-token-auth.md) - Login code generation

## Technical Details

See [Design Document](../../.agents/artifacts/designer/designs/installation-clipboard-experience-design.md) for complete implementation specification.

## References

- PowerShell `Set-Clipboard`: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/set-clipboard
- macOS `pbcopy`: Built-in, available on all macOS versions
