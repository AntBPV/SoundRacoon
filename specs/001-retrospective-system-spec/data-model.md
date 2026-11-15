# Data Model: Retrospective SoundRacoon System

This model describes the SQLite schema and related runtime records already present in the
repository. It is not a proposed schema.

## Database Runtime

- **File**: `catalogar.db` under Electron `app.getPath('userData')`.
- **Configuration**: WAL journal mode and foreign keys enabled.
- **Versioning**: SQLite `user_version` selects ordered SQL migrations.
- **Current migrations**: Version 1 creates the core schema; version 2 adds `tracks.year`.
- **Cleanup rule**: Folder deletion cascades to tracks and scan errors; orphaned albums and
  artists are pruned after folder removal.

## Entities

### Folder

Represents a user-selected root directory.

| Field | Type/constraint | Meaning |
|---|---|---|
| `id` | INTEGER primary key | Folder identity |
| `path` | TEXT, required, unique case-insensitive | Resolved local path |
| `added_at` | TEXT, required | Registration timestamp |
| `last_scan_at` | TEXT nullable | Last completed scan timestamp |

Folder paths may not duplicate or overlap an already registered root. Removing a folder
removes its catalog records but does not touch files on disk.

### Artist

Represents a case-insensitive unique artist name. Tracks reference the artist through
`artist_id`; albums may reference an album artist through `album_artist_id`.

### Album

Represents an album title and optional album artist/year.

| Field | Type/constraint | Meaning |
|---|---|---|
| `id` | INTEGER primary key | Album identity |
| `title` | TEXT, required, case-insensitive | Album title |
| `album_artist_id` | Foreign key, nullable | Album artist |
| `year` | INTEGER nullable | Album year |

The effective identity is `(title, album_artist_id)`, with null album artists treated as a
shared identity by the unique expression index.

### Track

Represents one supported local audio file.

| Field group | Fields |
|---|---|
| Identity and relationships | `id`, `folder_id`, `album_id`, `artist_id` |
| File state | `file_path`, `file_size`, `file_mtime_ms`, `scanned_at` |
| Tags | `title`, `track_no`, `disc_no`, `year`, `has_tags`, `has_cover` |
| Technical media | `duration_sec`, `codec`, `lossless`, `bitrate`, `sample_rate`, `bit_depth` |

`file_path` is unique case-insensitively. `folder_id` is required and cascades on folder
deletion. Optional album and artist references become null when those entities are pruned.
Boolean values are stored as checked integers.

### Scan Error

Represents a file or directory that could not be read during scanning.

| Field | Type/constraint | Meaning |
|---|---|---|
| `id` | INTEGER primary key | Error identity |
| `folder_id` | Nullable foreign key | Related folder |
| `file_path` | TEXT, required | Failing path |
| `message` | TEXT, required | Error description |
| `occurred_at` | TEXT, required | Error timestamp |

Errors cascade when their folder is removed. Library queries return at most 2,000 error rows,
while the total count is returned separately.

### Runtime records

The IPC contract also exposes non-persistent records:

- **ScanResult**: folder id, added/updated/unchanged/removed/error counts, cancellation state,
  and any AcoustID candidates collected after a completed scan.
- **ScanProgress**: discovery, metadata-reading, or identification phase, processed count,
  total, and current file.
- **TrackPage**: total matching tracks and a bounded row page.
- **AcoustIdCandidate**: file path, score, optional title/artist/album, track number, and track
  count.

## State Transitions

### Folder and scan lifecycle

`unregistered -> registered -> scanning -> scanned`

During scanning, the state may transition to `cancelled` or `failed`. Cancellation preserves
completed writes and does not prune unvisited tracks. A root access failure leaves the existing
index untouched. A successful completed scan updates the folder scan timestamp and reconciles
new, changed, unchanged, removed, and errored files.

### Track lifecycle

`discovered -> metadata-read -> inserted|updated`

An unchanged file follows `discovered -> unchanged` based on stored size and modification time.
An unreadable file produces a scan error. A missing file is removed after a completed scan.
An untagged track may enter AcoustID identification; a candidate can remain pending, be
rejected, or be written after confirmation.

## Query and Validation Rules

- Search terms are folded for case and accent-insensitive matching and each term must match
  title, artist, album, or path.
- Wildcards in user search input are escaped.
- Sort keys are allowlisted; invalid values fall back to artist sorting.
- Query limits are clamped to 1..500 and offsets to non-negative integers.
- Empty values sort last and track id provides a stable tie-breaker.
- Supported scan extensions are `.flac`, `.mp3`, `.ogg`, `.opus`, `.m4a`, and `.wav`.
