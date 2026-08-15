# Agent Guidelines

This file is the Codex entrypoint. Claude Code uses `CLAUDE.md`.
Keep tool-specific behavior in the root entrypoint files and keep shared project knowledge under `docs/agents/`.

## Shared Context

`docs/agents/` holds long-lived project knowledge shared by every coding agent; root entrypoint files (`AGENTS.md`, `CLAUDE.md`) stay tool-specific and only bootstrap. Prefer adding new durable rules to `docs/agents/` over these entrypoint files.

Read the relevant shared documents under `docs/agents/` before changing related code — see `CLAUDE.md`'s "공통 지식"/"레이어별 상세 문서" sections for the current list and what each file covers.

Directory-specific deep-dive notes live in each FSD directory's `CLAUDE.md` (`app/`, `entities/`, `features/`, `widgets/`, `shared/`).

Claude-specific agents, hooks, commands, and skills remain under `.claude/`. Codex does not execute those automatically, so run the relevant verification commands explicitly when practical.
