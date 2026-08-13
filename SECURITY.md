# Security notes

## API keys

Music Trend Radar stores the user-provided YouTube Data API key in browser `localStorage` by design. This makes the key persistent on that browser but also means JavaScript running on the same site origin can access it.

Recommended controls:

- Restrict the key to YouTube Data API v3 only.
- Restrict the key to the production website using HTTP referrers.
- Avoid third-party script tags and tag managers on this application.
- Keep dependencies updated.
- Do not log API keys.
- Do not send API keys to analytics services.

The current V1 calls Google directly from the browser and does not include application code that forwards the key to a custom backend.
