---

description: "Retrospective documentation, inspection, and verification tasks for SoundRacoon"
---

# Tasks: Retrospective SoundRacoon System

**Input**: Design documents from
`/specs/001-retrospective-system-spec/`

**Scope**: Documentation, repository inspection, and verification only. Existing application
functionality is not to be implemented or refactored.

**Status convention**: Completed tasks document work already verified during the retrospective
workflow. Pending tasks are validation activities that require a runtime environment, sample
media, credentials, or user interaction.

## Phase 1: Setup and Artifact Inventory

**Purpose**: Establish the retrospective evidence set and document the existing artifacts.

- [x] T001 Inspect `docs/PROJECT_CONTEXT.md`, `package.json`, TypeScript configurations, Electron
  configuration, and repository structure; record evidence in `specs/001-retrospective-system-spec/research.md`
- [x] T002 [P] Confirm the retrospective scope and non-goals in
  `specs/001-retrospective-system-spec/spec.md` without adding future functionality
- [x] T003 [P] Confirm the generated artifact set (`plan.md`, `research.md`, `data-model.md`,
  `contracts/ipc-api.md`, and `quickstart.md`) under `specs/001-retrospective-system-spec/`

## Phase 2: Foundational Consistency Verification

**Purpose**: Verify that the retrospective artifacts agree with the repository and constitution.

- [x] T004 Compare the architecture description in
  `specs/001-retrospective-system-spec/plan.md` with `src/main/`, `src/preload/`, and
  `src/renderer/src/`; record only existing boundaries
- [x] T005 Compare the entity and constraint description in
  `specs/001-retrospective-system-spec/data-model.md` with
  `src/main/db/migrations.ts`, `src/main/db/folders.ts`, and `src/main/db/tracks.ts`
- [x] T006 Compare the IPC operations in
  `specs/001-retrospective-system-spec/contracts/ipc-api.md` with `src/preload/index.ts`,
  `src/preload/api-types.d.ts`, and `src/main/ipc/`
- [x] T007 Compare retrospective constraints and verification limits with
  `.specify/memory/constitution.md`; confirm no source or dependency changes are required
- [x] T008 Run `git diff --check` and scan all retrospective artifacts for unresolved template
  placeholders or `NEEDS CLARIFICATION` markers

## Phase 3: User Story 1 - Index a Selected Music Folder (Priority: P1)

**Goal**: Verify and document the existing folder registration and initial scan behavior.

**Independent Test**: Add a disposable folder containing recognized audio files and confirm that
the folder, scan progress, counts, metadata, and tag status are visible.

- [x] T009 [US1] Document the existing folder registration and automatic-scan flow in
  `specs/001-retrospective-system-spec/spec.md` and
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T010 [US1] Manually verify folder selection, automatic scanning, metadata extraction, and
  library counts with disposable media using the steps in
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T011 [US1] Manually verify folder removal deletes catalog records but leaves disposable
  media files on disk, then record the result in
  `specs/001-retrospective-system-spec/quickstart.md`

## Phase 4: User Story 2 - Keep the Local Index Synchronized (Priority: P1)

**Goal**: Verify the existing incremental, full, canceled, and error-producing scan behavior.

**Independent Test**: Change, add, remove, and make inaccessible files between scans and compare
the observed result with `spec.md` and `data-model.md`.

- [x] T012 [US2] Document incremental comparison, forced rescanning, cancellation, orphan
  pruning, and scan-error behavior in
  `specs/001-retrospective-system-spec/data-model.md`
- [ ] T013 [US2] Manually verify unchanged files are skipped, changed files are updated, and
  removed files are pruned after a completed scan; record evidence in
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T014 [US2] Manually verify cancellation retains completed work and does not prune
  unvisited entries, then record the result in
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T015 [US2] Manually verify root-folder failures and nested read failures follow the
  documented index-preservation and error-recording behavior in
  `specs/001-retrospective-system-spec/spec.md`

## Phase 5: User Story 3 - Browse and Find Indexed Tracks (Priority: P1)

**Goal**: Verify the existing catalog search, filtering, sorting, paging, and error view.

**Independent Test**: Use an indexed disposable library to exercise each catalog query behavior
without changing source code.

- [x] T016 [US3] Record the existing search, accent folding, wildcard escaping, allowlisted
  sorting, bounded paging, and error limits in
  `specs/001-retrospective-system-spec/data-model.md`
- [x] T017 [US3] Record the existing renderer catalog and IPC query contract in
  `specs/001-retrospective-system-spec/contracts/ipc-api.md`
- [ ] T018 [US3] Manually verify title, artist, album, and path search; untagged/error filters;
  sort direction changes; paging; and error display, then record results in
  `specs/001-retrospective-system-spec/quickstart.md`

## Phase 6: User Story 4 - Identify and Optionally Repair Metadata (Priority: P2)

**Goal**: Verify and document the existing AcoustID, fpcalc, credential, confirmation, and
metadata-write behavior without modifying application code.

**Independent Test**: With disposable media, a personal key, `fpcalc.exe`, and network access,
perform one lookup, one rejected candidate, and one confirmed candidate.

- [x] T019 [US4] Document the existing fpcalc resolution, AcoustID request validation,
  approximately three-requests-per-second pacing, credential storage, and write confirmation
  behavior in `specs/001-retrospective-system-spec/research.md` and
  `specs/001-retrospective-system-spec/contracts/ipc-api.md`
- [x] T020 [US4] Record live credentials, fpcalc availability, network responses, and real-file
  metadata compatibility as unverified boundaries in
  `specs/001-retrospective-system-spec/plan.md` and
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T021 [US4] Manually verify missing-key, missing-fpcalc, invalid-response, timeout, and
  no-candidate outcomes without writing metadata, then record results in
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T022 [US4] Manually verify candidate rejection performs zero writes and candidate
  confirmation reports writes and errors for disposable media; record results in
  `specs/001-retrospective-system-spec/quickstart.md`

## Phase 7: User Story 5 - Play a Local Track (Priority: P2)

**Goal**: Verify the implemented basic playback path and distinguish it from incomplete controls.

**Independent Test**: Select representative disposable tracks and exercise load, play/pause,
progress, seeking, and failure reporting.

- [x] T023 [US5] Document the existing media-read IPC, MIME mapping, Blob playback flow, basic
  controls, and diagnostic path in
  `specs/001-retrospective-system-spec/contracts/ipc-api.md`
- [x] T024 [US5] Record incomplete broader playback controls and codec-dependent verification
  limits in `specs/001-retrospective-system-spec/spec.md`
- [ ] T025 [US5] Manually verify automatic load, play/pause, elapsed time, duration, seeking,
  and playback error reporting with disposable tracks; record results in
  `specs/001-retrospective-system-spec/quickstart.md`

## Phase 8: Polish and Cross-Cutting Verification

**Purpose**: Run repository-level checks and close the retrospective documentation package.

- [ ] T026 [P] Run `npm run typecheck` and record whether Node and web projects pass in
  `specs/001-retrospective-system-spec/quickstart.md`
- [ ] T027 [P] Run `npm run lint` and `npm run build`; record results and any environment
  limitations in `specs/001-retrospective-system-spec/quickstart.md`
- [x] T028 Review `specs/001-retrospective-system-spec/` for accidental implementation tasks,
  proposed architecture, new dependencies, generated build output, or credentials
- [ ] T029 Complete the remaining manual quickstart checks and update
  `specs/001-retrospective-system-spec/quickstart.md` with observed evidence or explicit
  inability to execute each environment-dependent scenario

## Dependencies and Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Complete; no dependency on application changes.
- **Foundational (Phase 2)**: Complete; depends on the artifact inventory.
- **User Stories 1-3 (Phases 3-5)**: Documentation is complete; manual verification tasks
  depend on the disposable media environment.
- **User Stories 4-5 (Phases 6-7)**: Documentation is complete; manual verification depends
  on external services or representative media.
- **Polish (Phase 8)**: T026-T027 are repository checks and T029 is the final environment-
  dependent verification summary.

### User Story Dependencies

- **US1**: No other story dependency; folder indexing is the baseline.
- **US2**: Depends on an indexed folder from US1 for meaningful manual verification.
- **US3**: Depends on indexed tracks from US1; no source implementation dependency.
- **US4**: Depends on indexed/untagged tracks from US1 and may use US2 scan results.
- **US5**: Depends on indexed tracks from US1; no dependency on AcoustID.

## Parallel Execution Opportunities

- T002, T003, T004, T005, T006, and T007 are independent documentation inspections.
- T010 and T011 can run in parallel after a disposable library is prepared.
- T013, T014, and T015 can run in parallel after an indexed disposable folder exists.
- T018 can run independently from T013-T015 once tracks are indexed.
- T021 and T022 can run in parallel when separate disposable files/configuration are available.
- T025 can run independently of AcoustID verification.
- T026 and T027 can run in parallel because they use separate repository checks.

## Implementation Strategy

This retrospective task set has no implementation MVP. The documentation MVP is complete:
`spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/ipc-api.md`, and `quickstart.md`
describe the observed system. Remaining work is optional runtime verification only; it must not
be converted into source changes or new product requirements.

## Task Format Validation

All tasks use the required checklist format: checkbox, sequential `T###` identifier, optional
`[P]` marker, required `[US#]` marker for user-story phases, and a concrete repository path.
