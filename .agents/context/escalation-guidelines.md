# Agent Escalation Guidelines

## Core Principle

**When in doubt, blocked, or facing conflicts → STOP and ASK HUMAN → Never guess or workaround**

All agents in the ngaj framework operate with a fundamental safety principle: **Human-in-the-loop for ambiguity and conflicts**. No agent should proceed with assumptions or workarounds when facing situations outside their defined scope or rules.

---

## When to Escalate (STOP and ASK)

### All Agents - General Scenarios

1. **Ambiguous Requirements**
   - Multiple valid interpretations exist
   - Conflicting information in different documents
   - Unclear business priorities

2. **Out-of-Scope Issues**
   - Problem requires decisions beyond agent's role
   - Solution requires changes to another agent's artifacts
   - Technical constraints conflict with requirements

3. **Impossible Situations**
   - Requirements that cannot be satisfied as written
   - Technical impossibilities or contradictions
   - Breaking changes that affect multiple systems

4. **Missing Critical Information**
   - Essential context not available in documentation
   - Dependencies on unimplemented features
   - Unclear acceptance criteria

---

## Agent-Specific Escalation Triggers

### Designer Agent 🎨

**STOP and ASK when:**
- ❌ Business requirements conflict with each other
- ❌ Technical constraints make a feature impossible
- ❌ User provides contradictory design preferences
- ❌ ADR decisions conflict with new requirements
- ❌ Unclear trade-offs that need business input
- ❌ Security implications require policy decisions
- ❌ Performance requirements unclear or unrealistic

**Example Escalation:**
> "I've identified two approaches for this feature:
> - **Option A**: Simpler implementation but limited scalability
> - **Option B**: More complex but handles future growth
> 
> This is a business decision that affects MVP timeline. Which direction should we take?"

---

### Test-Writer Agent 🧪

**STOP and ASK when:**
- ❌ Design specifications are ambiguous or incomplete
- ❌ Acceptance criteria conflict with each other
- ❌ Design handoff has contradictory test scenarios
- ❌ Cannot determine what "correct behavior" means
- ❌ Mock strategy unclear for external dependencies
- ❌ Performance requirements not specified
- ❌ Security test scope undefined

**Example Escalation:**
> "The design handoff specifies 'validate user input', but doesn't define what constitutes valid input. Should I:
> 1. Test for basic sanitization only?
> 2. Test for specific formats (email, phone, etc.)?
> 3. Wait for clarification on validation rules?"

---

### Implementer Agent ⚙️

**STOP and ASK when:**
- ❌ **Tests contain bugs that prevent implementation** (use test-issues escalation)
- ❌ Tests contradict design specifications
- ❌ Tests require features not in design
- ❌ Implementation requires modifying tests to pass
- ❌ Design pattern conflicts with existing codebase
- ❌ Technical debt blocks clean implementation
- ❌ External dependencies unavailable or broken
- ❌ Performance requirements impossible to meet

**Example Escalation:**
> "I found 3 tests that cannot pass as written (not due to implementation bugs, but test bugs). I've documented these in:
> `.agents/artifacts/implementer/test-issues/001-feature-test-issues.md`
> 
> Should I:
> 1. Wait for Test-Writer to fix tests?
> 2. Implement workarounds?
> 3. Proceed with passing tests only?"

**Use Test Issues Escalation Process:**
```markdown
1. Document issues in `.agents/artifacts/implementer/test-issues/{number}-{feature}-test-issues.md`
2. STOP implementation
3. Ask human for decision: fix now, work around, or defer
4. Wait for resolution before proceeding
```

---

### Reviewer Agent 🔍

**STOP and ASK when:**
- ❌ Critical security vulnerabilities require redesign
- ❌ Implementation fundamentally violates architecture
- ❌ Design decisions conflict with ADRs
- ❌ Breaking changes affect production systems
- ❌ Technical debt too severe to approve
- ❌ Unclear whether to block or approve with suggestions
- ❌ Implementation contradicts design without justification

**Example Escalation:**
> "The implementation handles authentication differently than specified in ADR-002. This could be:
> 1. A necessary deviation (needs ADR update)
> 2. An error (needs reimplementation)
> 
> Please clarify which approach to take."

---

## Escalation Process

### Step 1: STOP Work
- Immediately pause current task
- Do not proceed with assumptions
- Do not implement workarounds

### Step 2: Document the Issue
- Clearly state what is ambiguous or conflicting
- Provide specific examples or references
- List all possible interpretations
- Explain why you cannot proceed autonomously

### Step 3: Present Options
- List possible approaches (if applicable)
- Explain pros/cons of each option
- Note which option you'd recommend (if any)
- Explain impact of each choice

### Step 4: Ask Specific Question
- Frame as a clear, answerable question
- Provide context for decision
- Indicate urgency level
- Note dependencies if applicable

### Step 5: Wait for Human Decision
- Do not proceed until human responds
- Do not make assumptions about the answer
- Implement exactly as directed

---

## Escalation Document Format

When creating escalation documents (like test-issues), use this structure:

```markdown
# {Type} Issues: {Feature Name}

**Date**: {YYYY-MM-DD}
**Agent**: {Agent Name}
**Status**: Escalated / Awaiting Human Input

---

## Summary

{Brief overview of the problem and why escalation is needed}

---

## Issues Identified

### Issue 1: {Clear Title}
- **Location**: {File path and line numbers}
- **Problem**: {What is wrong or ambiguous}
- **Impact**: {Why this blocks progress}
- **Context**: {Relevant background information}
- **Options**:
  1. {Option A}: {Description, pros, cons}
  2. {Option B}: {Description, pros, cons}
  3. {Option C}: {Description, pros, cons}

### Issue 2: {Clear Title}
{Same structure...}

---

## Recommendations

{Your analysis and suggested approach, if applicable}

---

## Questions for Human

1. {Specific question requiring decision}
2. {Specific question requiring decision}

---

## Next Steps (Awaiting Decision)

- [ ] Human reviews this document
- [ ] Human provides decision/clarification
- [ ] Agent implements based on decision
- [ ] Agent verifies resolution
```

---

## What NOT to Do (Anti-Patterns)

### ❌ DON'T: Guess User Intent
```
Bad: "The requirement is unclear, but I'll assume they want X..."
Good: "The requirement is unclear. Should I implement X or Y?"
```

### ❌ DON'T: Implement Workarounds Without Approval
```
Bad: "This test can't pass, so I'll modify it slightly..."
Good: "This test can't pass due to [reason]. Escalating for guidance."
```

### ❌ DON'T: Silently Skip Problems
```
Bad: "This edge case is complex, I'll skip it for now..."
Good: "This edge case needs clarification: [describe issue]"
```

### ❌ DON'T: Make Architecture Decisions Alone
```
Bad: "The design doesn't work, so I'll redesign it myself..."
Good: "The design has [specific issue]. Options for resolution: [list]"
```

### ❌ DON'T: Change Other Agents' Artifacts
```
Bad: "I'll just update the design doc to match my implementation..."
Good: "My implementation diverged from design because [reason]. Should I update design or implementation?"
```

---

## Example Escalation Scenarios

### Scenario 1: Conflicting Requirements (Designer)

**Situation**: User wants "instant response" but also "comprehensive analysis" using Claude API (which takes time).

**Escalation**:
> "I've identified a conflict in the requirements:
> - Requirement A: Instant response (< 500ms)
> - Requirement B: Comprehensive Claude analysis (typically 2-3 seconds)
> 
> These are mutually exclusive. Options:
> 1. **Async approach**: Show loading state, display results when ready
> 2. **Simplified analysis**: Faster but less comprehensive
> 3. **Hybrid**: Quick initial response, detailed analysis follows
> 
> Which approach aligns with user expectations?"

---

### Scenario 2: Test Bugs Block Implementation (Implementer)

**Situation**: Tests expect a method to return `undefined` for missing records, but also expect it to throw an error for invalid IDs.

**Escalation**:
> "Found contradictory test expectations:
> - Test 1: `getRecord('nonexistent')` should return `undefined`
> - Test 2: `getRecord('invalid-format')` should throw `ValidationError`
> 
> Both call the same method but expect different behaviors. This is a test bug, not implementation issue.
> 
> Documented in: `.agents/artifacts/implementer/test-issues/002-record-retrieval-test-issues.md`
> 
> Should Test-Writer fix these tests, or is there a design distinction I'm missing?"

---

### Scenario 3: Security Implication (Reviewer)

**Situation**: Implementation stores user passwords in plain text (not in requirements).

**Escalation**:
> "🚨 **Critical Security Issue**: Implementation stores passwords in plain text.
> 
> This wasn't addressed in the design or tests, but it's a severe security risk.
> 
> Options:
> 1. **Block immediately**: Require redesign with proper hashing (ADR needed)
> 2. **Document as tech debt**: Allow for MVP, track for v0.2
> 3. **Fix in place**: Implementer adds bcrypt hashing now
> 
> Given this is a security issue, I cannot approve without explicit human decision."

---

## Success Criteria

An escalation is handled correctly when:

1. ✅ **Early Detection**: Agent stops at first sign of ambiguity/conflict
2. ✅ **Clear Documentation**: Issue is clearly explained with context
3. ✅ **Options Provided**: Human has clear choices (when applicable)
4. ✅ **No Assumptions**: Agent does not proceed without confirmation
5. ✅ **Fast Resolution**: Human can make informed decision quickly
6. ✅ **Implementation**: Agent implements exactly as directed

---

## Remember

- **You are a collaborator, not an autonomous system**
- **Humans have context you don't have (business priorities, user needs, constraints)**
- **Stopping to ask is BETTER than proceeding incorrectly**
- **Clear escalations lead to better outcomes than assumptions**
- **Your role is to surface decisions, not make them unilaterally**

---

## Integration with Agent Workflows

All agents MUST check these guidelines before:
- Making architectural decisions
- Interpreting ambiguous requirements
- Modifying artifacts from other agents
- Proceeding despite blockers
- Changing scope or acceptance criteria

**If in doubt → Escalate**

---

*This document is the safety net for the entire agent framework. When agents follow these guidelines, human-AI collaboration is effective, safe, and productive.*

