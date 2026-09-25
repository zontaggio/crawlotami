# Changelog

All notable changes to crawlotami are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org).

## [Unreleased]

## [2.0.0] - 2026-09-25

### Breaking

- Rewritten in TypeScript. Run it with `npm run build && npm start` (or Docker) instead of `node index.js`.
- Requires Node.js 22.12 or later.

### Added

- Docker image and Compose file for running around the clock.
- `npm run notify:test` to check the Telegram setup without signing in to Prenotami.
- Optional settings: `CHECK_INTERVAL_MINUTES`, `HEARTBEAT_HOURS`, `PRENOTAMI_SERVICE_ROW`, `HEADLESS`, `TIMEZONE` and `LOCALE`.
- A message when open slots disappear again.
- Formatted Telegram messages with a direct booking link.

### Changed

- Check intervals below 5 minutes are raised to 5.
- Telegram is called directly through the Bot API, and `.env` is read by Node itself. This removes 175 dependencies and every known vulnerability in production dependencies.
- Telegram errors now include the API's explanation (e.g. "chat not found").

### Fixed

- The slot alert was sent twice, and again on every check while slots stayed open.
- `.env.example` described 300000 ms as 10 minutes.
- The repository had no LICENSE file despite declaring MIT.

## [1.0.0] - 2026-03-13

### Added

- Signs in to Prenotami through the iam.esteri.it SSO and checks the passport service for open slots.
- Telegram alerts, an hourly heartbeat, automatic re-authentication and a 30-minute pause on CAPTCHAs.

[Unreleased]: https://github.com/zontaggio/crawlotami/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/zontaggio/crawlotami/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/zontaggio/crawlotami/releases/tag/v1.0.0
