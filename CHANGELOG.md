# bedrock-web-pouch-edv ChangeLog

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
