# CHK-03 evidence (SC-02 + SC-03 negatives)

Environment: Docker Compose (`docker/docker-compose.yml`).

Evidence:

- `overwrite-guard-disabled.png`: overwrite guard blocks transcription when subtitles already exist and overwrite is not confirmed.
- `invalid-key-401.png`: invalid key (401) error shown; subtitles are not silently overwritten.
- `network-cors-error.png`: simulated network/CORS failure (fetch rejected with `TypeError`) shows user-friendly message.
- `oversize-preflight.png`: oversize file is rejected by preflight before attempting network call.
