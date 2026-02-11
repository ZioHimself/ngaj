/**
 * Paste Instructions Utility
 *
 * Displays paste instructions for Windows terminal users during the setup wizard.
 * Called before password/hidden input prompts to guide users on how to paste.
 *
 * @see ADR-021: Installation Clipboard Experience
 * @see 018-installation-clipboard-experience-handoff.md
 */

/**
 * Display paste instructions for terminal users.
 * Called before password/hidden input prompts.
 *
 * Output format:
 * ```
 *
 * 📋 Tip: To paste in this terminal:
 *    • Windows Terminal: Right-click or Ctrl+Shift+V
 *    • PowerShell: Right-click
 *
 * ```
 */
export function showPasteInstructions(): void {
  console.log('');
  console.log('📋 Tip: To paste in this terminal:');
  console.log('   • Windows Terminal: Right-click or Ctrl+Shift+V');
  console.log('   • PowerShell: Right-click');
  console.log('');
}
