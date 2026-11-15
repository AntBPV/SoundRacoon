# Implementation Plan: Retrospective SoundRacoon System

**Branch**: `001-retrospective-system-spec` | **Date**: 2026-11-15 |
**Spec**: [spec.md](./spec.md)

**Input**: Retrospective documentation of the existing architecture and implementation,
including the technology stack, components, data model, integrations, and verification limits.

## Summary

This plan documents the current SoundRacoon desktop application rather than proposing a
change. The implementation is an Electron desktop application with a React renderer, a
preload/context-bridge contract, main-process IPC handlers, local SQLite persistence, recursive
audio scanning, optional AcoustID identification, metadata writing, and basic playback.

The design artifacts record only behavior and structure verified in source, configuration,
dependency manifests, and `docs/PROJECT_CONTEXT.md`. Details not demonstrated by the repository
are explicitly marked as unverified.

## Technical Context

**Language/Version**: TypeScript 5.9 and JavaScript; Node/Electron runtime version is governed
by Electron 44 and the repository lockfile.

**Primary Dependencies**: Electron 44, React 19, Electron Vite 5, Electron Builder 26,
`better-sqlite3`, `music-metadata`, `node-taglib-sharp`, `@electron-toolkit/preload`,
`@electron-toolkit/utils`, and TanStack React Virtual.

**Storage**: Local SQLite database `catalogar.db` under Electron `userData`, using WAL mode,
foreign keys, and ordered SQL migrations. Encrypted AcoustID configuration is stored in
`userData/config.json` through Electron `safeStorage`.

**Testing**: No test runner, test script, CI workflow, or source test files were found.
Available verification commands are `npm run typecheck`, `npm run lint`, `npm run format`,
`npm run build`, and platform packaging scripts.

**Target Platform**: Electron desktop packaging for Windows, macOS, and Linux. The configured
fingerprint executable path is Windows-specific (`fpcalc.exe`), so cross-platform availability
of that integration is not verified.

**Project Type**: Desktop application.

**Performance Goals**: No general latency, throughput, memory, or library-size target is
specified. The observed implementation limits one track query to 500 rows, caps returned scan
errors at 2,000 rows, and paces AcoustID requests at approximately three per second.

**Constraints**: User-selected local folders; no direct renderer Node.js access; privileged
operations through preload and IPC; no metadata write without user confirmation; external
identification depends on a personal AcoustID key, `fpcalc.exe`, and network access.

**Scale/Scope**: Single-user local library with no demonstrated multi-user, synchronization,
cloud catalog, or remote storage behavior. Maximum supported library size and production
resource limits are not specified.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Electron process boundary**: PASS. The plan describes main, preload, IPC, and renderer
  boundaries without proposing to move privileged operations.
- **Local library as source of truth**: PASS. The data model reflects SQLite migrations,
  incremental file state, and scan errors.
- **Explicit user-controlled media operations**: PASS. Folder selection, confirmation before
  metadata writes, and non-destructive folder removal are documented.
- **External integration isolation**: PASS. AcoustID, `fpcalc`, `safeStorage`, and failure
  behavior are recorded as existing integrations.
- **Incremental, verifiable changes**: PASS. The plan is documentation-only and reports the
  absence of automated tests instead of inventing coverage.
- **Scope**: PASS. No source, dependency, deployment, or architecture changes are proposed.

No constitution violations require complexity justification.

## Project Structure

### Documentation (this feature)

```text
specs/001-retrospective-system-spec/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── ipc-api.md
└── tasks.md              # Not created by this command
```

### Source Code (repository root)

```text
src/
├── main/
│   ├── index.ts          # Electron lifecycle, window, media reads, diagnostics
│   ├── config.ts         # Encrypted AcoustID key configuration
│   ├── acoustid.ts       # fpcalc, AcoustID lookup, candidate selection, tag writing
│   ├── db/               # SQLite connection, migrations, folders, tracks, text helpers
│   ├── ipc/              # IPC registration and handlers
│   └── scanner/          # Recursive discovery and metadata extraction
├── preload/
│   ├── index.ts          # contextBridge window.api exposure
│   ├── api-types.d.ts    # shared IPC data contract
│   └── index.d.ts
└── renderer/src/
    ├── App.tsx
    ├── components/       # track table, player, errors, versions
    ├── hooks/             # paged track queries
    ├── views/             # library, tracks, settings
    └── lib/               # formatting helpers
```

**Structure Decision**: The repository is a single Electron project with three runtime
surfaces. The main process owns privileged behavior and persistence, preload exposes a typed
bridge, IPC modules transport operations, and the React renderer presents the user flows.
The existing layout is documented as-is.

## Phase 0: Research

Phase 0 findings are consolidated in [research.md](./research.md). Research resolved the
following verification questions:

- The effective technology stack and build targets.
- The runtime process boundaries and IPC contract location.
- The SQLite schema and migration behavior.
- External integrations and credential handling.
- Available automated checks and unverified operational assumptions.

## Phase 1: Design and Contracts

Phase 1 artifacts are:

- [data-model.md](./data-model.md): current SQLite entities, relationships, constraints, and
  lifecycle behavior.
- [contracts/ipc-api.md](./contracts/ipc-api.md): observable preload/IPC operations and
  payload/result shapes.
- [quickstart.md](./quickstart.md): runnable validation scenarios for the existing behavior,
  including prerequisites and known verification limits.

## Post-Design Constitution Check

- The artifacts preserve the existing Electron process boundary and do not prescribe an
  alternative architecture.
- The data model records the existing local SQLite source of truth and migration rule.
- The IPC contract keeps media, filesystem, database, and external service access behind the
  existing preload bridge.
- The quickstart distinguishes repository checks from real-world AcoustID and playback tests
  that cannot be verified without external environment prerequisites.

**Result**: PASS. This is a retrospective implementation record; no implementation work,
dependency changes, or new system requirements are introduced.

## Complexity Tracking

Not applicable. No constitution violations or architectural additions are proposed.
