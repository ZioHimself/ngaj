# First-Launch Wizard - Design Document

📋 **Decision Context**: [ADR-012: First-Launch Setup Wizard](../../../../docs/architecture/decisions/012-first-launch-wizard.md)

**Date**: 2026-01-22  
**Status**: Approved

---

## Overview

Web UI wizard that runs once on first launch to create Profile, connect Bluesky account, and configure discovery. Shows when no Profile exists; redirects to `/opportunities` on completion.

**Type Definitions**: `src/shared/types/wizard.ts`

---

## 1. Wizard Flow

```
[No Profile in DB] → /setup → Step 1 → Step 2 → Step 3 → /opportunities
                              Profile   Account   Discovery
```

**Activation**: Express middleware checks `db.profiles.count() === 0` on all routes except `/setup`.

---

## 2. API Endpoints

| Step | Action | Endpoint | Request Type | Response |
|------|--------|----------|--------------|----------|
| 1 | Create Profile | `POST /api/profiles` | `WizardProfileInput` | `Profile` |
| 2 | Test Connection | `POST /api/accounts/test-connection` | `TestConnectionInput` | `TestConnectionResult` |
| 2 | Create Account | `POST /api/accounts` | `WizardAccountInput` | `Account` |
| 3 | Set Discovery | `PATCH /api/accounts/:id` | `WizardDiscoveryInput` | `Account` |

**Note**: Existing CRUD endpoints used. Only `test-connection` is new.

---

## 3. Type Definitions

See `src/shared/types/wizard.ts` for complete definitions.

### Wizard-Specific Input Types

```typescript
// Step 1: Simplified profile creation for wizard
interface WizardProfileInput {
  name: string;           // 3-100 chars
  voice: string;          // 10-500 chars (maps to voice.style)
  principles: string;     // 10-500 chars
  interests: string[];    // max 20 tags, each max 30 chars
}

// Step 2: Connection test
interface TestConnectionInput {
  platform: 'bluesky';
}

interface TestConnectionResult {
  success: boolean;
  handle: string;         // handle from .env
  error?: string;
}

// Step 3: Simplified discovery schedule
interface WizardDiscoveryInput {
  schedulePreset: DiscoverySchedulePreset;  // '15min' | '30min' | '1hr' | '2hr' | '4hr'
}
```

### Schedule Presets

```typescript
type DiscoverySchedulePreset = '15min' | '30min' | '1hr' | '2hr' | '4hr';

const SCHEDULE_PRESET_CRON: Record<DiscoverySchedulePreset, string> = {
  '15min': '*/15 * * * *',
  '30min': '*/30 * * * *',
  '1hr':   '0 * * * *',
  '2hr':   '0 */2 * * *',
  '4hr':   '0 */4 * * *',
};
```

---

## 4. Validation Rules

| Field | Rule |
|-------|------|
| Profile name | Required, 3-100 chars, unique |
| Voice | Required, 10-500 chars |
| Principles | Required, 10-500 chars |
| Interests | Optional, max 20 tags, each max 30 chars |
| Consent checkbox | Required before Step 2 "Next" |
| Connection test | Must pass before Step 2 "Next" |

---

## 5. State Management

**Frontend (React)**:
- Local state for current step (1, 2, 3)
- `profileId` stored after Step 1 success
- `accountId` stored after Step 2 success

**Backend**:
- No wizard state stored
- Each step creates/updates database records independently
- Browser refresh restarts wizard but pre-populates from existing records

---

## 6. Error Handling

| Error | User Action |
|-------|-------------|
| Validation error | Show inline error, fix and retry |
| Profile name exists | "Name already exists. Choose different name." |
| Connection test fails | "Check credentials in .env and restart services." |
| API error | Show error banner, "Retry" button |
| Network error | "Check connection and try again." |

---

## References

- [ADR-012](../../../../docs/architecture/decisions/012-first-launch-wizard.md) - Decision rationale and UI mockups
- [Type Definitions](../../../../src/shared/types/wizard.ts) - Wizard-specific types
