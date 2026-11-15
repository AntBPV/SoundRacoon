# IPC API Contract: Retrospective SoundRacoon System

This is the observable preload contract currently exposed as `window.api`. It documents
existing channels and payload intent; it does not define a new public API.

## Result Convention

Most invoke handlers return `IpcResult<T>`:

```text
{ ok: true, data: T } | { ok: false, error: string }
```

Errors are normalized by the shared IPC handler. `media:data` returns media bytes and MIME
type directly, while `reportMediaError` and scan progress use one-way events.

## Channels

| API method | Channel | Input | Result/behavior |
|---|---|---|---|
| `listFolders` | `folders:list` | none | Registered folder rows |
| `pickAndAddFolder` | `folders:pick-and-add` | none | Folder row, null if picker canceled |
| `removeFolder` | `folders:remove` | folder id | Removes catalog records, not disk files |
| `startScan` | `scan:start` | folder id, `force` | Scan result and pending candidates |
| `cancelScan` | `scan:cancel` | none | Aborts current scan if one exists |
| `getScanErrors` | `scan:errors` | folder id | Errors from that folder's latest scan |
| `getLibraryStats` | `library:stats` | none | Track, album, artist, untagged, error counts |
| `getTracks` | `library:tracks` | search/filter/sort/offset/limit | Bounded track page |
| `getAllScanErrors` | `library:errors` | none | Total and up to 2,000 error rows |
| `lookupAcoustId` | `acoustid:lookup` | file path | Fingerprint lookup and best candidate |
| `writeAcoustId` | `acoustid:write` | optional folder id, candidates | Written count and per-file errors |
| `getAcoustIdConfigStatus` | `config:acoustid-status` | none | Whether a key is configured |
| `saveAcoustIdApiKey` | `config:save-acoustid-key` | API key | Stores encrypted key |
| `getTrackData` | `media:data` | file path | File bytes and supported MIME type |
| `reportMediaError` | `media:error` | diagnostic object | Writes media diagnostic; no return |

## Events

- `scan:progress`: phase (`discovering`, `reading`, or `identifying`), processed count, total,
  and current file. The sender is checked for destruction before progress is emitted.
- `reportMediaError`: renderer-to-main diagnostic event containing playback/read details.

## Security and Failure Behavior

- The renderer receives the API through `contextBridge`; no direct Node.js API is exposed by
  the application contract.
- `scan:start` rejects a second concurrent scan.
- Lookup requires a configured key and validates fingerprint and AcoustID responses.
- Metadata writes require an explicit UI confirmation before invoking `writeAcoustId`.
- Unsupported media extensions produce an explicit error from `media:data`.
- Errors are returned through the result wrapper or thrown through the handler normalization;
  they are not represented as successful data.
