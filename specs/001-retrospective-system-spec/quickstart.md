# Quickstart Validation: Retrospective SoundRacoon System

This guide validates the current implementation. It is not an implementation plan and does
not require adding dependencies or source changes.

## Prerequisites

- Node.js and npm compatible with the repository lockfile.
- Repository dependencies installed with `npm install`.
- For local identification checks only: `resources/fpcalc.exe` or `FPCALC_PATH`, a personal
  AcoustID key, and network access.
- A disposable directory containing representative `.flac`, `.mp3`, `.ogg`, `.opus`, `.m4a`,
  and `.wav` files, including at least one file without tags.

## Static Repository Checks

Run the existing checks from the repository root:

```powershell
npm run typecheck
npm run lint
npm run build
```

Expected outcomes:

- Both Node and web TypeScript projects typecheck successfully.
- ESLint reports no new lint failures.
- Electron Vite produces the existing main, preload, and renderer build output.

There is no configured `npm test` command or automated test suite.

## Manual Library Flow

1. Start the application with `npm run dev`.
2. Add a disposable music folder from **Biblioteca**.
3. Confirm that scanning starts automatically and progress is shown.
4. Confirm counts for tracks, albums, artists, untagged tracks, and errors.
5. Run an incremental rescan without changing files and confirm unchanged behavior.
6. Add or modify a file, rescan, and confirm the catalog updates.
7. Request **Reescanear todo** and confirm unchanged files are reread.
8. Cancel a long scan and confirm the catalog remains usable and existing entries are not
   pruned solely because of cancellation.
9. Remove the folder and confirm the catalog entries disappear while the disposable files
   remain on disk.

## Manual Catalog and Playback Flow

1. Open **Pistas** and verify all, untagged, and error sections.
2. Search by a title, artist, album, and file path term.
3. Change each available sort column and toggle its direction.
4. Move through pages when the library contains more rows than one page.
5. Select a playable track and verify automatic load, play/pause, elapsed time, duration, and
   seeking.
6. Try an unreadable or unsupported encoding and verify an error is displayed and logged.

## Manual AcoustID Flow

1. Open **Configuración** and save a personal key.
2. Select an untagged track and request identification.
3. Confirm that fingerprinting and the external lookup return a candidate or an explicit error.
4. Reject a candidate and verify no metadata change.
5. Repeat and confirm a candidate; verify the reported write count and rescan behavior.
6. Remove or misconfigure `fpcalc.exe`, disable network access, or use an invalid key and
   verify that failures are surfaced without silent writes.

## Verification Boundaries

The following cannot be proven by repository checks alone:

- Real AcoustID responses, credentials, rate-limit behavior, and metadata compatibility across
  representative files.
- Playback support for every codec inside a recognized extension.
- Maximum library size, resource consumption, CI execution, and production update hosting.
- Availability of `fpcalc.exe` in every packaged distribution.
