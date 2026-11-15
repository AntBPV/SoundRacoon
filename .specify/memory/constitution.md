<!--
Sync Impact Report
- Version change: unversioned scaffold -> 1.0.0
- Modified principles: template placeholders -> five principles based on the current
  Electron, IPC, persistence, integration, and UI boundaries
- Added sections: Technology and Runtime Constraints; Development Workflow
- Removed sections: none
- Follow-up TODOs: RATIFICATION_DATE remains TODO because the original adoption date
  is not recorded in the repository
-->

# SoundRacoon Constitution

## Core Principles

### I. Preserve the Electron Process Boundary
SoundRacoon MUST keep privileged file-system, SQLite, media, configuration, and external
service operations in the Electron main process. Renderer code MUST access those operations
through the typed preload/context-bridge API and registered IPC handlers; it MUST NOT gain
direct Node.js access as a shortcut. This preserves the existing main/preload/renderer
architecture and limits the surface exposed to the user interface.

### II. Treat the Local Library as the Source of Truth
The application MUST represent scanned folders, tracks, metadata, scan state, and scan
errors in the local SQLite database. Database changes MUST use the existing migration
mechanism, SQLite foreign-key enforcement, and the repository's text-normalization helpers.
File scans MUST preserve the current incremental behavior based on file modification and
verification timestamps, unless a deliberate force scan is requested. This keeps the
library consistent with the user's local files without requiring a remote catalog.

### III. Keep Media Operations Explicit and User-Controlled
The application MUST read and write only files and folders explicitly selected or approved
by the user. Supported media formats and metadata behavior MUST remain aligned with the
existing scanner, `music-metadata`, `node-taglib-sharp`, and media IPC contracts. Metadata
writes based on AcoustID candidates MUST remain a distinct, confirmable action rather than
an implicit consequence of scanning or lookup. This protects local files and matches the
current separation between discovery, lookup, and writing.

### IV. Isolate External Integrations and Their Failure Modes
Interactions with `fpcalc.exe` and the AcoustID API MUST remain behind main-process
integration modules and IPC contracts. The implementation MUST validate external responses,
surface actionable errors, and respect the existing AcoustID request pacing and cancellation
behavior. API credentials MUST be stored through Electron `safeStorage` and MUST NOT be
bundled into source or installers. The application remains useful for local scanning and
playback when the external integration is unavailable.

### V. Prefer Incremental, Verifiable Changes
Changes MUST preserve existing user-visible behavior unless the change explicitly defines a
behavioral update. Contributors MUST run the narrowest applicable repository checks, including
the relevant TypeScript typecheck, lint, formatting check, or build command. The repository
currently provides typecheck, lint, formatting, and Electron build scripts but no configured
automated test script; new test requirements MUST NOT be represented as an existing practice
until a test strategy and runner are added. This records the actual quality gates without
claiming a test-first workflow that the project does not currently enforce.

## Technology and Runtime Constraints

SoundRacoon is a desktop Electron application using TypeScript and JavaScript with a React
renderer. The build is managed by Electron Vite and Electron Builder. Persistent data is
stored locally with `better-sqlite3`; audio metadata is read with `music-metadata` and written
with `node-taglib-sharp`. AcoustID lookup depends on a user-provided API key and `fpcalc.exe`,
which is supplied through the resources directory or an `FPCALC_PATH` override.

The renderer uses the existing React views, shared preload type declarations, and paged track
queries. Packaging targets Windows, macOS, and Linux through the existing Electron Builder
configuration. New dependencies, packaging targets, persistence formats, or external services
MUST be justified against these current constraints and MUST not silently replace them.

Known implementation boundaries are part of the current baseline: playback controls are
partial, and the repository documentation does not fully agree on the status of AcoustID
metadata writing. Before changing either area, the intended behavior MUST be clarified and
the relevant documentation and implementation MUST be reconciled.

## Development Workflow

Work MUST follow the existing source boundaries: main-process modules for privileged
operations, preload for the exposed contract, IPC modules for transport, database modules for
persistence, scanner/integration modules for media concerns, and renderer components/views for
presentation. Public IPC changes MUST update the corresponding preload declarations and all
callers.

Before proposing a change, contributors MUST inspect the affected implementation and related
documentation. A change is complete only when its directly affected typecheck, lint,
formatting, or build checks pass, or a failure is reported with its cause. Changes MUST NOT
include unrelated source refactors, generated build output, credentials, or user media.
Repository behavior and open questions MUST be documented before introducing new governance
rules.

## Governance

This constitution records the architecture and practices that exist in the repository; it
does not authorize features that are only described as future intent. When implementation,
documentation, and this constitution disagree, the discrepancy MUST be identified and
resolved by an explicit amendment or a separate feature specification.

Amendments MUST update this file only through the constitution workflow, include a Sync Impact
Report, preserve the template heading hierarchy, replace all defined placeholders, and record
the rationale for any new or redefined principle. The amendment MUST be reviewed against the
current source, project context, package scripts, and affected documentation. Compliance is
checked during change review and whenever a feature specification, plan, or task list is
prepared.

Versions use semantic versioning. A MAJOR increment removes or redefines a compatibility
constraint or principle. A MINOR increment adds a principle or materially expands governance.
A PATCH increment clarifies wording without changing obligations. The version and amendment
date MUST be updated together; the original ratification date MUST be preserved once known.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): original adoption date is not
recorded in the repository | **Last Amended**: 2026-11-15
