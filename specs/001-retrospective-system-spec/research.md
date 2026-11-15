# Research: Retrospective SoundRacoon System

**Date**: 2026-11-15

This research records repository evidence used to document the implementation. It does not
select a future architecture or introduce dependencies.

## Technology Stack

**Decision**: Record Electron 44, Electron Vite 5, Electron Builder 26, React 19, TypeScript
5.9, Vite 7, `better-sqlite3`, `music-metadata`, `node-taglib-sharp`, and the Electron Toolkit
packages as the current stack.

**Rationale**: These versions and dependencies are declared in `package.json`, while
`electron.vite.config.ts` and the two TypeScript configurations show the build split between
main/preload and renderer.

**Alternatives considered**: None. This is documentation of declared dependencies, not a
technology choice.

## Runtime Architecture

**Decision**: Describe three runtime surfaces: Electron main process, preload bridge, and React
renderer, with IPC modules connecting the renderer contract to privileged operations.

**Rationale**: `src/main/index.ts` owns application lifecycle, database initialization, media
reads, and diagnostics. `src/preload/index.ts` exposes `window.api` through `contextBridge`.
`src/main/ipc/index.ts` registers folder, scan, library, AcoustID, and configuration handlers.

**Alternatives considered**: A web-service or direct renderer-to-filesystem architecture was
not considered because no such implementation exists.

## Persistence and Data Model

**Decision**: Document SQLite `catalogar.db` with migrations 1 and 2, WAL mode, foreign keys,
and tables for folders, artists, albums, tracks, and scan errors.

**Rationale**: `src/main/db/index.ts` establishes the database and migration execution.
`src/main/db/migrations.ts` defines the schema, uniqueness rules, indexes, and the later track
year column. `src/main/db/tracks.ts` implements query filtering, sorting, and paging.

**Alternatives considered**: No remote database, ORM, or export format is present in the
inspected source.

## External Integrations

**Decision**: Document `fpcalc.exe` as the fingerprint executable, AcoustID lookup as the
external metadata candidate source, `node-taglib-sharp` as the writer, and Electron
`safeStorage` as credential protection.

**Rationale**: `src/main/acoustid.ts` defines the executable resolution, timeouts, response
validation, request pacing, candidate selection, and writing flow. `src/main/config.ts`
encrypts the user key into `userData/config.json`.

**Alternatives considered**: No alternative provider or authentication mechanism is implemented.
`electron-updater` is declared but no source usage was found, so it is recorded as an unused
declared dependency rather than an active integration.

## Testing and Verification

**Decision**: Treat typecheck, lint, formatting, build, and packaging scripts as available
repository checks, and record automated test coverage, CI, live AcoustID behavior, and
distribution-wide `fpcalc` availability as unverified.

**Rationale**: `package.json` defines the available scripts. No `test` script or test source files
were found during inspection. Runtime behavior requiring actual media, credentials, network
access, or packaged resources cannot be proven from static repository inspection alone.

**Alternatives considered**: No test framework or CI workflow was added because this task is
documentation-only.

## Resolved Unknowns and Remaining Limits

All implementation unknowns needed by the plan were resolved from repository evidence. The
following remain explicitly unverified rather than being treated as design decisions:

- Maximum supported library size and general performance thresholds.
- Cross-platform operation of the Windows-named `fpcalc.exe` integration.
- Live AcoustID credentials, network responses, and metadata write behavior on representative
  files.
- Playback support for every encoding inside the six recognized extensions.
- Production update hosting; the configured publish URL is `https://example.com/auto-updates`.
