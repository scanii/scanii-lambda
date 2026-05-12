# Changelog

All notable changes to `scanii-lambda` are documented here. Versions follow [SemVer](https://semver.org).

## [3.0.1] — Node.js 24 handler compatibility

### Fixed

- `lib/s3-handler.js` and `lib/ag-handler.js` were `async` functions that still
  accepted a `callback` parameter and called `callback(null, response)`. AWS
  Lambda Node.js 24 removes support for callback-based handlers and rejects the
  shape at init time with `Runtime.CallbackHandlerDeprecated`, causing the
  v3.0.0 SAM stack to fail to start. Both handlers now use the supported
  `async (event, context) => { return response }` pattern. See [#110](https://github.com/scanii/scanii-lambda/issues/110).

### Tests / CI

- Added a `handler.length <= 2` assertion to each handler's unit test suite —
  catches any future regression to the callback shape on every PR.
- New `Lambda Node 24 runtime init smoke` CI job spins up each handler inside
  the official `public.ecr.aws/lambda/nodejs:24` image (Runtime Interface
  Emulator bundled) and POSTs an invocation. Fails on any `Runtime.*` errorType
  (`CallbackHandlerDeprecated`, `ImportModuleError`, `MalformedHandlerName`, …),
  which catches a broader class of runtime-init regressions than `node` alone.
- PR matrix narrowed to `ubuntu-latest` × Node 22/24. Lambda only ever runs on
  the Linux Lambda runtime — windows/macos runners produced no useful signal.
- Fixed a pre-existing silent test bug: `"should fail to process a directory"`
  used a fixture key with no trailing `/`, so the guard never triggered;
  assertions inside the (now removed) callback were silently swallowed by mocha.

---

## [3.0.0] — Port to `@scanii/core`, Node.js 24 runtime

### Changed

- Replaced the in-tree Scanii HTTP client with the published [`@scanii/core`](https://www.npmjs.com/package/@scanii/core)
  Node SDK. The Lambda is now a thin wrapper around the canonical client; bug
  fixes and new API surface flow in via dependency updates.
- SAM `template.yml` runtime bumped to `nodejs24.x`.

### Tests / CI

- New integration tests exercise the `@scanii/core` wrapper against scanii-cli.
- CI uses [`scanii/setup-cli-action`](https://github.com/scanii/setup-cli-action)
  for cross-platform scanii-cli bootstrap.
- Release workflow migrated to OIDC.
