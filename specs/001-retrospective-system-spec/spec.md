# Feature Specification: Retrospective SoundRacoon System

**Feature Branch**: `001-retrospective-system-spec`

**Created**: 2026-11-15

**Status**: Implemented baseline

**Input**: User description: "Crea una especificacion retrospectiva del sistema existente."

## Purpose and Scope

SoundRacoon is a desktop application for people who keep their music locally and need to
index, inspect, search, identify, and play audio files from folders they select.

The implemented scope covers:

- Registering user-selected folders and scanning supported audio files.
- Reading available audio metadata and showing files without tags.
- Persisting a local library index, scan results, and scan errors.
- Searching, filtering, sorting, and paging indexed tracks.
- Calculating fingerprints and querying AcoustID when the user has configured a personal key.
- Reviewing returned matches before writing selected metadata to local files.
- Basic playback of a selected local track.

The system does not provide a complete music-management suite. Lyrics, downloading files,
similarity or recommendation features, and a redesigned frontend are outside the current
scope. Playback controls are present but incomplete, as described below.

## User Roles and Capabilities

### Local music owner

The system has one observable user role: a person operating the application on their own
device. This user can:

- Add and remove folders from the library.
- Start an incremental scan or request a full rescan.
- Cancel an active scan and view its progress.
- View library counts, tracks, untagged files, and scan errors.
- Search and sort indexed tracks, and filter untagged tracks or scan errors.
- Select a track for playback.
- Configure a personal AcoustID key, request identification, and review a candidate before
  confirming a metadata write.

There are no separate administrator, shared-library, or multi-user permissions in the
implemented behavior.

## User Scenarios & Testing

### User Story 1 - Index a selected music folder (Priority: P1)

As a local music owner, I can add a folder so that its supported audio files become visible
in my library.

**Why this priority**: Indexing is the prerequisite for the catalog, identification, and
playback flows.

**Independent Test**: Select a folder containing supported audio files, wait for the scan to
finish, and verify that the library counts and track list reflect the files.

**Acceptance Scenarios**:

1. **Given** no folders are registered, **when** the user selects and adds a folder,
   **then** the folder appears in the library and scanning starts automatically.
2. **Given** a registered folder contains supported audio files, **when** scanning completes,
   **then** readable metadata, file information, and tag status are available in the catalog.
3. **Given** the user closes the folder picker, **when** the add-folder action completes,
   **then** no folder is added and the existing library remains unchanged.
4. **Given** a folder is registered, **when** the user removes it and confirms,
   **then** the folder and its indexed entries are removed from the library while the files
   remain on disk.

### User Story 2 - Keep the local index synchronized (Priority: P1)

As a local music owner, I can rescan a folder and see additions, modifications, removals,
and read errors reflected in the library.

**Why this priority**: The catalog must remain useful as local files change.

**Independent Test**: Change, add, remove, and make inaccessible selected files between scans;
then compare the resulting counts, metadata, and error list.

**Acceptance Scenarios**:

1. **Given** an indexed file has unchanged size and modification time, **when** an incremental
   rescan runs, **then** the file is not reread and is reported as unchanged.
2. **Given** an indexed file is new or changed, **when** an incremental rescan runs,
   **then** its index entry is added or updated.
3. **Given** an indexed file no longer exists, **when** the scan completes, **then** its
   orphaned index entry is removed.
4. **Given** a user cancels a scan, **when** cancellation completes, **then** the scan ends
   cleanly, already-read data remains, and existing entries are not removed as a consequence
   of cancellation.
5. **Given** a root folder is inaccessible, **when** a scan starts, **then** the scan reports
   the failure without partially changing that folder's index.
6. **Given** a nested file or subfolder cannot be read, **when** the scan continues, **then**
   the error is recorded and other discoverable files are still processed.
7. **Given** the user requests a full rescan, **when** it runs, **then** all files are reread
   even when their size and modification time are unchanged.

### User Story 3 - Browse and find indexed tracks (Priority: P1)

As a local music owner, I can browse a paged catalog and narrow it by text, tag status, or
scan errors.

**Why this priority**: The catalog is the primary way to inspect the local collection.

**Independent Test**: Populate a library, search for values in title, artist, album, and path,
switch filters, and sort by each available column.

**Acceptance Scenarios**:

1. **Given** indexed tracks exist, **when** the user opens the tracks view, **then** tracks
   are listed with counts for all tracks, untagged tracks, and scan errors.
2. **Given** the user enters a search term, **when** typing stops, **then** matching title,
   artist, album, or path results are displayed.
3. **Given** the user chooses a sort column, **when** the column is selected again,
   **then** its direction toggles; selecting a different column starts ascending order.
4. **Given** the user selects the untagged filter, **when** results load, **then** only tracks
   marked without tags are shown.
5. **Given** the user selects the error filter, **when** results load, **then** recorded
   scan errors are shown and the track search control is not applicable.
6. **Given** more results exist than fit in one page, **when** the user changes page,
   **then** the next page is loaded without requiring the whole library to be displayed at once.

### User Story 4 - Identify and optionally repair metadata (Priority: P2)

As a local music owner, I can request an external identification for a track or for
untagged scan results and decide whether to write the returned metadata.

**Why this priority**: Identification assists with incomplete files but is not required for
local browsing and playback.

**Independent Test**: Configure a key and fingerprint-capable environment, request a lookup,
review a returned candidate, and verify that writing occurs only after confirmation.

**Acceptance Scenarios**:

1. **Given** no personal AcoustID key is configured, **when** identification is requested,
   **then** the action fails with a configuration error and does not modify the file.
2. **Given** a valid key and supported file, **when** identification succeeds, **then** the
   result includes the fingerprint lookup data and the best available title, artist, album,
   and score candidate.
3. **Given** a lookup returns no candidate, **when** the result is shown, **then** the user is
   informed that no match was found and no metadata is written.
4. **Given** a candidate is returned, **when** the user declines confirmation, **then** the
   local file is unchanged.
5. **Given** a candidate is returned, **when** the user confirms, **then** the application
   attempts to write the selected metadata and reports the number of writes and errors.
6. **Given** multiple untagged files are identified during scanning, **when** queued requests
   run, **then** progress is shown and requests are paced at no more than approximately three
   per second.
7. **Given** the fingerprint tool or external service returns invalid data, an HTTP failure,
   or a timeout, **then** the user receives an error and the file is not silently modified.

### User Story 5 - Play a local track (Priority: P2)

As a local music owner, I can select an indexed track and use the available basic controls
to hear it.

**Why this priority**: Playback is a core purpose of the application, although the current
control set is partial.

**Independent Test**: Select a playable indexed audio file and verify automatic loading,
play/pause, elapsed and total time, and seeking.

**Acceptance Scenarios**:

1. **Given** an indexed track is selected, **when** playback starts, **then** the player shows
   its title, artist, album when available, and duration.
2. **Given** a track is loaded, **when** the user presses the player button, **then** playback
   toggles between playing and paused states.
3. **Given** a track has a known duration, **when** the user moves the progress control,
   **then** playback seeks to the selected position.
4. **Given** a file cannot be read, decoded, or supported by the player, **when** playback is
   attempted, **then** a user-visible error is shown and a diagnostic is recorded.

### Edge Cases

- The selected root folder is missing, disconnected, or inaccessible.
- A nested directory or file cannot be read during discovery or metadata extraction.
- An audio file has no tags, partial tags, an unsupported extension, or malformed metadata.
- A scan is canceled while discovery, metadata reading, or identification is in progress.
- The user has no AcoustID key, `fpcalc` is unavailable, or the external response is invalid.
- AcoustID returns no results or a candidate with incomplete title, artist, album, or release
  data.
- The selected media file cannot be decoded by the available audio playback support.
- A user removes a folder while viewing its tracks or errors.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST allow the user to register a folder through an explicit folder
  picker and MUST begin scanning it after registration.
- **FR-002**: The system MUST recursively discover supported audio files inside registered
  folders and MUST ignore unsupported file types.
- **FR-003**: The system MUST read available title, artist, album, track, disc, year, duration,
  codec, lossless, bitrate, sample rate, bit depth, cover, and tag-status information.
- **FR-004**: The system MUST persist registered folders, indexed tracks, normalized artist and
  album relationships, scan timestamps, and scan errors locally.
- **FR-005**: The system MUST skip unchanged files during an incremental scan by comparing the
  stored file size and modification time.
- **FR-006**: The system MUST support a user-requested full rescan that rereads unchanged files.
- **FR-007**: The system MUST update changed files, add new files, remove files no longer found,
  and preserve an index consistent with the scan result.
- **FR-008**: The system MUST expose scan progress, cancellation, counts, and per-folder or
  library-wide scan errors to the user.
- **FR-009**: The system MUST allow searching by title, artist, album, or file path, filtering
  all tracks or untagged tracks, sorting by title, artist, album, year, duration, format, or
  path, and paging the result list.
- **FR-010**: The system MUST allow the user to view recorded scan errors separately from tracks.
- **FR-011**: The system MUST allow the user to configure a personal AcoustID key and MUST
  report whether a key is configured.
- **FR-012**: The system MUST calculate a track fingerprint and duration before an AcoustID
  lookup and MUST validate the external response before exposing a candidate.
- **FR-013**: The system MUST keep identification and metadata writing separate, and MUST
  require user confirmation before writing a candidate's metadata.
- **FR-014**: The system MUST report failed lookup, fingerprint, write, and playback operations
  rather than silently treating them as successful.
- **FR-015**: The system MUST provide basic playback with automatic load on track selection,
  play/pause, progress display, seeking, and playback error reporting.
- **FR-016**: Removing a registered folder MUST remove its library index and MUST NOT delete
  the user's files from disk.

### Implemented, Incomplete, and Unverified Behavior

- **Implemented**: Folder registration/removal, recursive scanning, incremental and full
  rescans, cancellation, metadata extraction, local indexing, counts, search/filter/sort/page
  browsing, scan-error views, AcoustID lookup and confirmation flow, and basic playback.
- **Incomplete**: Playback has only the currently implemented basic controls; the broader set
  of controls described in the project context is not present.
- **Partially verified**: AcoustID metadata writing is exposed and implemented, but the
  repository documentation describes the lookup/write stage inconsistently. End-to-end
  behavior with real credentials, `fpcalc`, and real files was not verified during this
  retrospective inspection.
- **Not established**: No automated test runner or test suite is configured in the project,
  so these requirements are documented from source behavior and UI contracts rather than
  from automated acceptance tests.

### Key Entities

- **Folder**: A user-selected local directory, with its path and latest scan time.
- **Track**: An indexed supported audio file, including its path, file state, metadata, tag
  status, and playback-relevant media properties.
- **Artist**: A normalized library artist associated with tracks and albums.
- **Album**: A library album associated with a title, optional artist, and optional year.
- **Scan result**: Counts of added, updated, unchanged, removed, and errored files, plus
  cancellation state.
- **Scan error**: A file or directory path and the message recorded when it could not be read.
- **AcoustID candidate**: A proposed title, artist, album, score, and file association returned
  after fingerprint-based identification.
- **Local configuration**: The user's AcoustID credential status and encrypted credential data.

## Business Rules

- **BR-001**: The system operates on local files selected by the user; it does not download,
  delete, or relocate media as part of scanning or identification.
- **BR-002**: A normal rescan is incremental; a full rescan is explicit and may take longer.
- **BR-003**: A scan must not delete existing index entries merely because the user canceled it.
- **BR-004**: A root-folder access failure must not partially replace that folder's index.
- **BR-005**: Identification is optional and depends on a configured personal key and available
  fingerprint and network services.
- **BR-006**: External matches are suggestions; metadata is not written without confirmation.
- **BR-007**: Removing a folder from the library removes catalog ownership, not the underlying
  user files.
- **BR-008**: Errors are surfaced to the user or recorded as diagnostics; failures are not
  represented as successful operations.

## Main Workflows

### Add and scan a folder

1. The user opens the folder picker and selects a directory.
2. The system registers the directory and immediately starts discovery.
3. Supported files are found recursively and metadata is read.
4. The local index is inserted or updated, while unreadable entries are recorded as errors.
5. Scan progress and final counts are shown; untagged identification candidates may be
   presented for review.

### Rescan a folder

1. The user chooses an incremental rescan or an explicit full rescan.
2. The system compares discovered files with stored file state, unless full rescan was chosen.
3. New and changed files are read, unchanged files are retained, and missing files are
   pruned after a completed scan.
4. The user can cancel; completed work remains and removals are not applied by cancellation.

### Browse and play

1. The user opens the track catalog and optionally searches, filters, sorts, or pages results.
2. The user selects a track.
3. The player loads the local file and displays available identity and duration information.
4. The user can play, pause, and seek; read or decode failures are displayed and logged.

### Identify and write metadata

1. The user configures a personal AcoustID key.
2. The system calculates a fingerprint and duration for a selected track or queued untagged
   tracks.
3. The system requests candidates, validates the response, and presents the best available
   match with its score.
4. The user confirms or rejects the proposed write.
5. If confirmed, the system attempts the write and reports successes and errors.

## Success Criteria

### Measurable Outcomes

- **SC-001**: For a readable selected folder, every supported audio file discoverable during a
  completed scan appears exactly once in the catalog, unless it is later removed from disk.
- **SC-002**: A repeat scan of unchanged files reports them as unchanged and does not reread
  their metadata; a full rescan rereads them when explicitly requested.
- **SC-003**: After a completed scan, the displayed counts for tracks, albums, artists, untagged
  tracks, and scan errors match the indexed library state.
- **SC-004**: A user can locate a known indexed track by title, artist, album, or path and can
  reverse the sort direction of every offered sort column.
- **SC-005**: Canceling a scan leaves the library usable, retains completed work, and does not
  falsely report a successful removal of unvisited files.
- **SC-006**: With a configured key and working external dependencies, a successful lookup
  presents a candidate before any file metadata changes.
- **SC-007**: Declining a metadata confirmation produces zero writes for that confirmation;
  accepting it reports each successful write and each error.
- **SC-008**: Selecting a playable indexed track starts the basic player flow and exposes
  play/pause, elapsed time, total duration, and seeking.
- **SC-009**: When a required file, decoder, fingerprint tool, or external service fails, the
  user receives an error or diagnostic rather than a success-shaped result.

## Assumptions

- The operator has read access to selected folders and, when writing metadata, write access to
  the affected files.
- “Supported audio file” means the formats recognized by the current scanner and playback
  handling, not every possible audio format.
- AcoustID identification requires the user's own key, the bundled or configured fingerprint
  executable, and network availability.
- This document describes the repository state inspected on 2026-11-15; it is not a roadmap
  or a requirement to add the incomplete and out-of-scope capabilities.
- Quantitative performance limits beyond the observed approximately three AcoustID requests
  per second were not specified by the existing implementation and are intentionally omitted.

## Out of Scope and Open Verification Items

- Lyrics, downloading media, recommendations, similarity search, and frontend restructuring
  are outside the documented system scope.
- Full playback controls beyond the current play/pause/progress behavior are not implemented.
- Real-world end-to-end verification with a live AcoustID account, `fpcalc`, and representative
  media files remains unverified.
- The project context and README disagree about whether metadata writing is still pending;
  the source exposes the write flow, so this specification records it as implemented but
  partially verified rather than treating the documentation disagreement as a new requirement.
