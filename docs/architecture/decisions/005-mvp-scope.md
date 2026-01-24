# ADR-005: MVP Scope - Single Account, Quick Responses Only

## Status

**Accepted** - December 27, 2025

## Context

ngaj has an ambitious vision with many features (multi-account, multi-platform, Toulmin analysis, content origination, analytics, safety layers). We need to define a minimal viable product that delivers core value while remaining feasible to build quickly.

**Core Value Hypothesis:** "Users want help engaging authentically in high-value conversations they might otherwise miss."

## Decision

**v0.1 MVP includes:**

### ✅ In Scope
1. **Single Account** - One Bluesky account, credentials via `.env`
2. **Knowledge Base** - Manual upload (PDF/MD/TXT), vector storage, semantic search (deferred to v0.2 for UI)
3. **Bluesky Integration** - Auth, feed polling, reply posting
4. **Opportunity Discovery** - Scheduled cron job, simple scoring (impact + recency + keywords)
5. **Quick Response Mode** - Claude-powered suggestions with knowledge context, user reviews and posts
6. **Installation & Setup** - Self-contained installer with interactive CLI wizard, first-launch web UI setup (ADR-011, ADR-012)
7. **Basic UI** - Opportunity dashboard (view, generate, edit, post responses), read-only settings page

### ❌ Deferred to Future Versions
- **v0.2**: Multi-account, multi-platform (LinkedIn/Reddit), Toulmin analysis mode, knowledge base UI, dashboard overview, settings editing UI
- **v0.3**: Content origination (news monitoring), scheduled posts
- **v0.4**: Analytics, safety layer, advanced scoring
- **v0.5**: Auto-scraping past posts, full automation, automatic updates

## Rationale

**Why This Scope:**
- **Tests Core Loop**: Discovery → Context → AI Assist → Post is the essential value
- **Fast Validation**: 4-6 weeks to working product vs 12+ weeks for full vision
- **Simplest Path**: Single account removes auth complexity, env vars simplify credentials
- **Bluesky First**: Best API (AT Protocol), tech-savvy users, growing platform
- **Manual Safety**: User reviews all responses (no need for automated checks yet)

**Why Exclusions:**
- **No Multi-Account**: Most users start with one; can validate before adding complexity
- **No Toulmin Mode**: Quick suggestions may be sufficient for 80% of cases; add if demanded
- **No Safety Layer**: Low attack surface with local-first + manual review
- **No Content Origination**: Responding is higher value than proactive posting

## UI Scope Details

### Included in v0.1

**Installation & Setup:**
- Self-contained installer package (.pkg for macOS, .msi for Windows)
- Interactive CLI wizard for credentials (Bluesky, Claude API)
- Automatic dependency installation (Docker Desktop, databases)
- First-launch web UI wizard (Profile/Account setup, discovery configuration)

**Opportunity Dashboard Page** (Primary UI - ADR-013):
- List pending opportunities (post content, author, score)
- Generate response button (calls Claude with knowledge context)
- View/edit/post response workflow
- Status tracking (pending, draft ready, posted, dismissed)
- Server-side pagination (20 per page)
- Manual refresh for new opportunities

**Settings Page** (Read-Only):
- Display current Profile (voice, principles, interests)
- Display current Account (handle, connection status)
- Display discovery schedule
- Links to REST API documentation for advanced settings

**Empty States:**
- Empty opportunity dashboard messaging ("Next check in X minutes")
- Helpful tips and placeholder text throughout

### Deferred to v0.2

- Dashboard overview (statistics, charts, activity feed)
- Knowledge base management UI (upload, view, delete documents)
- Settings editing UI (must use REST API in v0.1)
- Multi-account switching UI
- Analytics pages

### Rationale

**Why prioritize Opportunity Dashboard over Overview Dashboard?**
- Core value loop: Discover → Review → Respond
- Dashboard is nice-to-have (tracking), not essential for MVP
- Reduces scope to ship faster

**Why defer Knowledge Base UI?**
- REST API sufficient for technical early adopters
- Reduces UI complexity for v0.1
- Can validate knowledge base feature before investing in UI

**Why read-only Settings?**
- Setup wizard handles initial configuration
- REST API available for adjustments
- Avoids building complex form validation/editing UI

## Consequences

### Positive
- **4-6 Week Timeline**: Can ship and test quickly
- **Clear Value**: Does one thing well
- **Easy Testing**: Fewer moving parts
- **Fast Learning**: Real usage informs v0.2 priorities
- **Maintainable**: Single developer can handle full scope

### Negative
- **Limited Appeal**: Users wanting multi-platform/multi-account will wait
- **Manual Work**: No automation, user reviews everything
- **Feature Requests**: Will hear "when will you add X?"

### Mitigation
- Clear roadmap communicates future plans
- Rapid iteration to v0.2 based on feedback
- Architecture supports future features (multi-account data model already designed)

## Success Criteria

v0.1 succeeds if users:
1. Install and complete setup in <15 minutes (including Docker download)
2. Discover 5-10 relevant opportunities per day
3. Find AI suggestions useful 70%+ of the time
4. Post 1-3 responses they wouldn't have made otherwise
5. Complete initial setup without external help or documentation
6. Want to keep using it

If met → Proceed to v0.2

## Version Roadmap

- **v0.1** (4-6 weeks): MVP - Single account, Bluesky, quick responses
- **v0.2** (4-6 weeks): Multi-account, LinkedIn/Reddit, Toulmin analysis
- **v0.3** (6-8 weeks): Content origination, scheduled posts
- **v0.4** (4-6 weeks): Analytics, safety, learning
- **v0.5** (4-6 weeks): Automation, polish

## References

- [Lean Startup](http://theleanstartup.com/)
- [ADR-001: MongoDB Storage](./001-mongodb-storage.md) - Supports multi-account future
- [ADR-002: Env Credentials](./002-env-credentials.md) - Simple for v0.1, evolvable
- [ADR-011: Installation and Setup Architecture](./011-installation-and-setup.md) - Consumer-friendly installation experience
- [ADR-012: First-Launch Setup Wizard](./012-first-launch-wizard.md) - Web UI guided setup flow
- [ADR-013: Opportunity Dashboard UI](./013-opportunity-dashboard-ui.md) - Primary user interface for reviewing and responding