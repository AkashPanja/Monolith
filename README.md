# Monolith

Personal NSE/BSE cash-equity algo trader — self-hosted, single owner, paper-first.
See `AGENTS.md` for agent instructions and `docs/` for requirements and design patches.

## Stack

FastAPI (api) · React (web) · Postgres 16 · Docker Compose · OpenWA (WhatsApp, internal only).

## Quickstart

```bash
docker compose -f infra/compose.yml up --build
```

## Layout

`apps/web` · `services/api|worker|watchdog|notifier|execution` · `libs/risk|ledger` · `infra/` · `docs/`

## Safety

Paper default. Only `services/execution/` places orders, only with gate-minted `ApprovedOrder`.
Details in `AGENTS.md`.
