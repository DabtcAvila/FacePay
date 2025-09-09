# CLAUDE.md

## Core Principles
- **SLA**: ≤7 min per request. Deliver value immediately.
- **ALWAYS PARALLEL**: Never sequential. Split everything. Multiple agents working simultaneously.
- **Fan-out**: Clone agents freely. 10 agents > 1 agent working 10x longer.

## Workflow

### Priorities
- **P0**: Security/payments/auth → immediate fix
- **P1**: Core features → same cycle
- **P2**: Enhancements → next cycle

### Branching
- Each agent owns their branch: `agent/[name]`
- Orchestrator manages `main`
- **Merge within 7 minutes**. No waiting.
- Feature flags for incomplete work.

## Execution Modes

### Fast Mode (default)
- Mocks for external services
- Stubs for payments/auth
- Local data only
- Use for: UI, logic, prototypes

### Complete Mode
- Real integrations
- Full auth flow
- Production-like data
- Use for: final testing, demos

## Deliverables Per Cycle
1. Working code (compiles/runs)
2. Visual proof (screenshot/preview)
3. Next steps documented
4. PR ready to merge

## Telemetry
- Log: `[agent_id] [timestamp] [action] [duration] [files]`
- Every action traced
- Performance metrics tracked
- No PII in logs

## Security
- Secrets in env vars only
- Privacy by default
- WebAuthn > passwords
- Permissions via PR only

## Agent Rules
- **NEVER WORK ALONE**: Clone yourself if task >3 min
- **PARALLEL ALWAYS**: If you have 3 tasks, spawn 3 agents
- Work in your branch
- Test before merge request
- Auto-merge if tests pass
- Timeout: 7 min hard limit