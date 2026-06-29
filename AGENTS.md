# Agent Guidelines

This file is the Codex entrypoint. Claude Code uses `CLAUDE.md`.
Keep tool-specific behavior in the root entrypoint files and keep shared project knowledge under `docs/agents/`.

## Shared Context

Read the relevant shared documents before changing related code:

- `docs/agents/commands.md`: common npm, OpenAPI, Docker, and local debugging commands.
- `docs/agents/architecture.md`: product overview, auth routing, FSD boundaries, aliases, and API layering.
- `docs/agents/constraints.md`: project-specific implementation constraints, frontend quirks, and coding rules.
- `docs/agents/deployment.md`: Vercel, Docker, env var, and kista-api integration operations.
- `docs/agents/app.md`: app router, proxy, cookies, route handlers, SSE, and PWA quirks.
- `docs/agents/entities.md`: domain DTOs, React Query patterns, OpenAPI, and KIS quirks.
- `docs/agents/features.md`: feature-slice responsibilities and mutation usage rules.
- `docs/agents/widgets.md`: page composition, responsive UI quirks, and widget patterns.
- `docs/agents/shared.md`: api-client, cache, proxy helpers, shared utilities, and providers.

Project-specific execution rules also live in:

- `docs/agents/constraints.md`: commit policy, verification defaults, coding rules, and implementation quirks.

Directory-specific deep-dive notes still live in:
- `app/CLAUDE.md`
- `entities/CLAUDE.md`
- `features/CLAUDE.md`
- `widgets/CLAUDE.md`
- `shared/CLAUDE.md`

Claude-specific agents, hooks, commands, and skills remain under `.claude/`. Codex does not execute those automatically, so run the relevant verification commands explicitly when practical.
