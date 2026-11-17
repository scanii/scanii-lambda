# Changelog

All notable changes to `scanii-lambda` are documented here. Versions follow [SemVer](https://semver.org).

## [3.1.1] — Security updates

### Fixed

- `fast-xml-parser` is no longer in the function: `@aws-sdk/client-s3` and
  `@aws-sdk/s3-request-presigner` are updated from 3.1010.0 to 3.1166.0, whose
  XML handling (`@aws-sdk/xml-builder` 3.972.43) no longer depends on it. That
  clears CVE-2026-126066 in `fast-xml-parser` 5.7.0, which the function ran,
  without the major upgrade of `@nodable/entities` that `fast-xml-parser`'s own
  fix (5.12.0) requires, and the `fast-xml-parser` and `fast-xml-builder`
  overrides are gone ([#124](https://github.com/scanii/scanii-lambda/issues/124)).
- `minimatch`, a development dependency of eslint and mocha, is held at 11.0.7
  by an override, for CVE-2026-118764 (fixed only in 11). eslint 10.15 and glob
  14 already require `minimatch` 11; mocha 12, the latest, still asks for 10,
  and its tests pass on 11. It does not run in the function, but it ships in the
  deployed package (see 3.0.3).

## [3.1.0] — Scanii SDK update

### Changed

- `@scanii/core`, the Scanii API client the submit handler uses, is updated
  from 1.1.0 to 1.5.0
  ([#121](https://github.com/scanii/scanii-lambda/pull/121)). The lambda calls
  only `fetch` and `retrieve`, which are unchanged; the SDK's new v2.2 methods
  (`retrieveTrace`, `processFromUrl`, `delete`, `deleteTrace`) and its
  `ScaniiTarget` constants are not used. SDK 1.3.0 deprecates the default
  latency-routed endpoint (`https://api.scanii.com`). The lambda does not rely
  on it: it always passes an explicit regional endpoint, from the
  `scaniiApiEndpoint` parameter (regional hosts only, default
  `api-us1.scanii.com`) or `API_ENDPOINT`, so no configuration change is
  needed.

### Fixed

- `serialize-javascript`, a development dependency pulled in by `mocha`, is
  updated from 7.1.2 to 7.1.3 for CVE-2026-115897
  ([#122](https://github.com/scanii/scanii-lambda/pull/122)). It does not run
  in the function, but it ships in the deployed package (see 3.0.3).

## [3.0.3] — Security updates

### Fixed

- `fast-xml-parser`, which the AWS SDK's S3 client uses to parse XML
  responses, is updated from 5.5.8 to 5.7.0 for CVE-2026-41650, and
  `fast-xml-builder` from 1.1.4 to 1.1.7 for CVE-2026-44665
  ([#114](https://github.com/scanii/scanii-lambda/pull/114)). Both run in the
  deployed function.
- Development tooling is updated: `brace-expansion` from 5.0.4 to 5.0.12, with
  its 2.x copy removed by the mocha upgrade (CVE-2026-102277, CVE-2026-13149);
  `flatted` from 3.4.1 to 3.4.2 (CVE-2026-33228); `js-yaml` from 4.1.1 to 4.3.2
  (CVE-2026-53550, CVE-2026-59869, CVE-2026-84375, GHSA-5p4m-2wfm-xmqj);
  `@humanfs/node` from 0.16.7 to 0.16.8 (GHSA-p498-v437-472g)
  ([#114](https://github.com/scanii/scanii-lambda/pull/114),
  [#115](https://github.com/scanii/scanii-lambda/pull/115)); and `mocha` from 11
  to 12, which brings `serialize-javascript` 7.1.2 (CVE-2026-34043)
  ([#117](https://github.com/scanii/scanii-lambda/pull/117)). None of these
  runs in the function, but `make build` installs development dependencies and
  `sam package` uploads the whole directory (`CodeUri: .`), so they were in the
  deployed package.

## [3.0.2] — Deployment README refresh

### Changed

- Rewrote the README around the AWS Serverless Application Repository customer
  deployment flow, including parameters, required post-deploy S3 trigger setup,
  result actions, and deployment verification.
- Moved the AWS deployment link into a prominent `Deploy on AWS` section and
  moved brittle endpoint enumeration out of the README in favor of the
  maintained endpoint documentation.
- Documented the advanced environment configuration defaults inline in
  `lib/config.js`.
- Corrected the SAM parameter defaults for `actionTagObject` and
  `actionDeleteObjectOnFinding` to use the documented and accepted `true` /
  `false` values.

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
