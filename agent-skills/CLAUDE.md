# agent-skills

This is the agent-skills project - a collection of production-grade engineering skills for AI coding agents.

## Project Structure

```
skills/       → Core skills (SKILL.md per directory)
agents/       → Reusable agent personas (code-reviewer, test-engineer, security-auditor)
hooks/        → Session lifecycle hooks
.claude/commands/ → Slash commands (/spec, /plan, /build, /test, /review, /code-simplify, /ship)
references/   → Supplementary checklists (testing, performance, security, accessibility)
docs/         → Setup guides for different tools
```

## Skills by Phase

**Define:** spec-driven-development
**Plan:** planning-and-task-breakdown
**Build:** incremental-implementation, test-driven-development, context-engineering, source-driven-development, doubt-driven-development, frontend-ui-engineering, api-and-interface-design
**Verify:** browser-testing-with-devtools, debugging-and-error-recovery
**Review:** code-review-and-quality, code-simplification, security-and-hardening, performance-optimization
**Ship:** git-workflow-and-versioning, ci-cd-and-automation, deprecation-and-migration, documentation-and-adrs, shipping-and-launch

## Conventions

- Every skill lives in `skills/<name>/SKILL.md`
- YAML frontmatter with `name` and `description` fields
- Description starts with what the skill does (third person), followed by trigger conditions ("Use when...")
- Every skill has: Overview, When to Use, Process, Common Rationalizations, Red Flags, Verification
- References are in `references/`, not inside skill directories
- Supporting files only created when content exceeds 100 lines

## Commands

- `npm test` - Not applicable (this is a documentation project)
- Validate: Check that all SKILL.md files have valid YAML frontmatter with name and description

## Boundaries

- Always: Follow the skill-anatomy.md format for new skills
- Never: Add skills that are vague advice instead of actionable processes
- Never: Duplicate content between skills - reference other skills instead

---

## Session Log - June 2026

### Working style notes from this session
- **Always surface what changed**: when fixing a bug, list the symptoms observed, the hypotheses tested, and the root cause
- **Visual confirmation matters**: a "working" state machine change isn't enough - the user needs a visible indicator that the action took effect (e.g., the Test API button needs to show "Flux: 0.750" after the request, not just a console.log)
- **Defer to user's judgment on direction**: when the user said "Just fix what's broken first," do exactly that. Don't add features or refactors that weren't asked for
- **Security scan before git push**: every commit to a public repo should pass: zero secrets, zero .pyc, zero .venv, zero SSH keys, zero tarballs. Make this a habit, not a one-off

### Rate-limit cascade
A new failure mode to recognize: when one noisy endpoint (ABM writing to `/api/ledger/entry` 100+/min) burns through a global per-IP rate limit, it starves every other endpoint for that IP. Symptoms: user's other requests silently 429, no console error, no state update. Fix: per-`(ip, path)` keying, OR per-service buckets.

### Adaptive weight pattern
For any "user labels output as right or wrong" feedback system:
- Bound weight change per verdict (e.g., ±0.1)
- Clamp to a sensible range (e.g., [0.1, 5.0])
- Reward agents that agreed with the user; penalize those that disagreed
- Persist every weight change as an audit event (weight_before, weight_after, verdict, user_id)
- All weights are derivable from the event log - no separate state synchronization needed
