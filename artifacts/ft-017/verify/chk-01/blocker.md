# CHK-01 blocker (local UI)

Attempted to start the app via `bin/dev` to collect UI evidence (screenshots + downloaded `.vtt`).

Result: failed immediately due to missing Ruby version required by `.ruby-version`.

```text
rbenv: version `ruby-3.4.9' is not installed (set by .../video_chat_and_translator/.ruby-version)
```

To proceed with CHK-01 evidence collection, run verification inside the project devcontainer (or any environment where Ruby `3.4.9` is available) and re-run the UI scenario `SC-01`.
