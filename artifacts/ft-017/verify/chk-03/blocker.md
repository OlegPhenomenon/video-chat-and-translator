## CHK-03 blocker (negative UI scenarios)

To collect negative-scenario UI evidence (overwrite guard + error states), the app must be started.

`bin/dev` fails locally due to missing Ruby version required by `.ruby-version`:

```
rbenv: version `ruby-3.4.9' is not installed (set by .../video_chat_and_translator/.ruby-version)
```

Proceed inside devcontainer (Ruby `3.4.9`) and collect screenshots for:
- invalid key (401/403)
- network/CORS failure (fetch TypeError)
- oversize preflight error
- overwrite guard without confirmation

