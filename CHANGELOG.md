# bedrock-web-pouch-edv ChangeLog

## 8.2.0 - 2025-07-18

### Changed
- Update dependencies:
  - `@digitalbazaar/ecdsa-multikey@1.8`
  - `pouchdb@9`
  - `pouchdb-adapter-indexeddb@9`
  - `pouchdb-find@9`
  - dev deps and removal of `uuid`.
- Note: While pouchdb* packages have been bumped by two major versions, no
  significant breaking changes are expected. The changes included internal
  ES5 => ES6+ API changes that were not relevant here and a new default
  limit on `find()` queries of `25`, but every `find()` query is already
  expected to have provided a default or a default is provided by this
  library.

## 8.1.0 - 2023-11-07

### Added
- Add new `cipherVersion` parameter to control whether the cipher version
  is "recommended" or "fips". The default (and previous only option)
  remains "recommended".

## 8.0.0 - 2023-10-16

### Changed
- **BREAKING**: Drop support for Node.js < 18.
- Use `@digitalbazaar/edv-client@16.0` that drops support for Node.js < 18 and
  uses `@digitalbazaar/http-client@4` and `canonicalize@2`.

## 7.0.0 - 2022-08-19

### Changed
- **BREAKING**: Use `exports` instead of `module`.
- Update dependencies.
- Lint module.

## 6.0.1 - 2022-05-30

### Fixed
- Add purge operation to clean up deleted docs to prevent premature storage
  quota overflow.

## 6.0.0 - 2022-05-30

### Changed
- **BREAKING**: Use `indexeddb` adapter instead of `idb` adapter. This version
  will also impose a `br_edv_` (bedrock EDV) prefix on database names,
  causing all new databases to be created, leaving old ones alone. There is
  no migration code available to convert an old database to a new one in this
  version.

## 5.0.0 - 2022-05-05

### Changed
- **BREAKING**: Use `@digitalbazaar/edv-client@14` with new blind
  attributes version.

## 4.1.0 - 2022-05-03

### Changed
- Improve pouchdb index performance by marking deleted EDV doc
  records with `_deleted` flag.

## 4.0.0 - 2022-04-05

### Changed
- **BREAKING**: Rename package to `@bedrock/web-pouch-edv`.
- **BREAKING**: Convert to module (ESM).
- **BREAKING**: Remove default export.
- **BREAKING**: Require node 14.x.

## 3.0.0 - 2022-03-01

### Changed
- **BREAKING**: Use `@digitalbazaar/edv-client@13`.

## 2.0.1 - 2022-02-24

### Fixed
- Provide alternative to `crypto.randomUUID` via `uuid` package.

## 2.0.0 - 2022-02-23

### Changed
- **BREAKING**: Use `@digitalbazaar/edv-client@12`. This new version
  produces encrypted indexes differently (more privacy preserving)
  and is incompatible with the previous version.

## 1.2.0 - 2022-02-05

### Added
- Add support for `limit` in EDV queries.

## 1.1.0 - 2022-02-03

### Added
- Automatically initialize databases when using
  `PouchEdvClient` to generate a new EDV or load an one.

### Fixed
- Fix `db.type()` deprecation warnings.
- Prevent double initialization of databases.

## 1.0.1 - 2022-02-02

### Changed
- Update dependencies.

## 1.0.0 - 2022-01-31

- See git history for changes.
