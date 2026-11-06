# Changelog

Notable repository-wide changes to the Tyhp IDE plugins, plus one line per client release. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Release notes for each client are in [vscode/CHANGELOG.md](vscode/CHANGELOG.md) and [phpstorm/CHANGELOG.md](phpstorm/CHANGELOG.md).

## [vscode 0.8.4] - 2026-11-06

### Changed

- VS Code extension 0.8.4 stops a project's language server when its last Tyhp tab closes, shows servers running for other projects in the status bar, and has a rewritten Marketplace and Open VSX page. See [vscode/CHANGELOG.md](vscode/CHANGELOG.md).
- PhpStorm plugin 0.7.1 adds an icon and the shared grammar updates (HTML outside `<?tyhp` blocks, Tyhp inside `<?=`, and `lazy new`). See [phpstorm/CHANGELOG.md](phpstorm/CHANGELOG.md).
- VS Code build, install, and publishing steps moved from `vscode/README.md` to [vscode/DEVELOPMENT.md](vscode/DEVELOPMENT.md). `DEVELOPMENT.md` and `QA.md` are no longer packed into the VSIX.

## [vscode 0.8.3] - 2026-11-04

### Changed

- VS Code extension 0.8.3 highlights HTML outside `<?tyhp` blocks and Tyhp inside `<?=`. See [vscode/CHANGELOG.md](vscode/CHANGELOG.md).

## [vscode 0.8.2] - 2026-11-03

### Changed

- VS Code extension 0.8.2 uses publisher `Tyhp` (`Tyhp.tyhp`) and an extension icon. See [vscode/CHANGELOG.md](vscode/CHANGELOG.md).

## Baseline - 2026-09-30

Tracking starts at commit `380351d`, with the VS Code extension at `0.8.1` and the PhpStorm plugin at `0.7.0`. Earlier repository-wide changes are not listed.
