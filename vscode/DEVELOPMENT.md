# Developing the Tyhp Language extension

Build, local install, publishing, and implementation notes for the VS Code / Cursor extension in `vscode/`. The user-facing description is [README.md](./README.md), which is also the Marketplace and Open VSX page. The manual QA checklist is [QA.md](./QA.md).

Product: **Tyhp Language** (`tyhp-lang`). Publisher: `Tyhp`. Extension ID: `Tyhp.tyhp`.

## Build and run (compile + F5)

The extension has a TypeScript entry point (`src/extension.ts`). Language contributions (TextMate grammars) load from `package.json` regardless; compiling is required so `main` can activate without an error.

From this directory (`vscode/`):

```bash
npm install
npm run compile
npm test
```

`npm run package` compiles, then **esbuild-bundles** `src/extension.ts` (including `vscode-languageclient`) into `out/extension.js` so the VSIX does not need `node_modules` at runtime, then runs `npm run check-package` and fails the build if any tsc per-module `out/<folder>/*.js` would be packed. Run `npm run check-package` on its own to re-check an existing build without repackaging.

**F5 (Extension Development Host):** open **this folder** (`vscode/`) as the workspace in VS Code or Cursor, then press F5. That uses `.vscode/launch.json` (`Run Extension`). The first launch compiles/watches via `.vscode/tasks.json`.

Highlighting QA samples: `samples/highlight-audit.tyhp`, `samples/highlight-audit.tyhpdef`, and `samples/highlight-audit.md`.

## Local installation

### Option 1: Symlink

Changes to the grammar are picked up on each window reload — no reinstall needed. Run `npm install` and `npm run compile` in this folder so `out/extension.js` exists.

**Important:** The symlink target must be an **absolute path** (e.g. `/Users/you/repos/tyhp-ide-plugin/vscode`). Do not use a relative path like `./vscode` — `ln -s` resolves relative targets from the extensions directory, not your current shell directory, which creates a broken self-referential symlink.

The symlink must also use Cursor/VS Code's expected folder name: `{publisher}.{name}-{version}` (from `package.json`). For this extension that is `Tyhp.tyhp-<version>` — currently `Tyhp.tyhp-0.8.4`.

If you previously installed as `tyhp-lang.tyhp-language-<version>` (old folder / old `name`) or `tyhp-lang.tyhp-0.8.1` / `0.7.0` / `0.5.0`, remove that install first.

From the clone root ([tyhp-ide-plugin](https://github.com/tyhpproject/tyhp-ide-plugin)):

```bash
rm -rf ~/.cursor/extensions/Tyhp.tyhp-0.8.4   # Cursor
ln -s "$(pwd)/vscode" ~/.cursor/extensions/Tyhp.tyhp-0.8.4

rm -rf ~/.vscode/extensions/Tyhp.tyhp-0.8.4  # VS Code
ln -s "$(pwd)/vscode" ~/.vscode/extensions/Tyhp.tyhp-0.8.4
```

Then **fully quit and reopen** Cursor/VS Code (`Cmd+Q`, not just "Reload Window"). If you previously had a broken install, also remove the extension from `~/.cursor/extensions/.obsolete` if it lists `tyhp-lang.tyhp-0.8.1`, `tyhp-lang.tyhp-0.8.0`, `tyhp-lang.tyhp-0.6.0`, `tyhp-lang.tyhp-0.5.0`, `tyhp-lang.tyhp-0.4.0`, `tyhp-lang.tyhp-0.3.1`, or `tyhp-lang.tyhp-language-0.2.1`.

### Option 2: Sideload a VSIX

From `vscode/` (requires `npm install` once):

```bash
npm run package
```

`vsce package` writes `tyhp-0.8.4.vsix` in this folder. A global `vsce` is optional; `npm run package` uses the local `@vscode/vsce` devDependency (`npx vsce package` is equivalent).

```bash
cursor --install-extension tyhp-0.8.4.vsix   # Cursor
code --install-extension tyhp-0.8.4.vsix     # VS Code
```

You can also use **Install from VSIX…** in the Extensions view (`…` menu).

### Option 3: Copy to the extensions directory

From the clone root, compile first (`npm run compile` inside `vscode/`), then copy. The folder name must be `Tyhp.tyhp-<version>`:

```bash
cp -r vscode ~/.cursor/extensions/Tyhp.tyhp-0.8.4   # Cursor
cp -r vscode ~/.vscode/extensions/Tyhp.tyhp-0.8.4   # VS Code
```

Then fully quit and reopen the editor.

### Removing a local install

Symlink or copy: delete `~/.cursor/extensions/Tyhp.tyhp-<version>` or `~/.vscode/extensions/Tyhp.tyhp-<version>`. VSIX: `cursor --uninstall-extension Tyhp.tyhp` or `code --uninstall-extension Tyhp.tyhp`.

## Publishing

Build once with `npm run package`, then upload that VSIX to both registries. The filename follows `package.json` `version` (currently `tyhp-0.8.4.vsix`). Leave the version argument off `vsce publish`: passing `patch`, `minor`, `major`, or a version string runs `npm version` and creates a git commit and tag.

`README.md` is the listing page on both registries and `CHANGELOG.md` is the Changelog tab. `DEVELOPMENT.md` and `QA.md` are excluded from the VSIX by `.vscodeignore`.

From `vscode/`:

```bash
npm run package
```

### Visual Studio Marketplace

VS Code installs from [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=Tyhp.tyhp). Publisher id is `Tyhp` (`package.json` `publisher`).

Create an Azure DevOps personal access token with organization **All accessible organizations** and scope **Marketplace (Manage)**. Pass it as `VSCE_PAT`, or store it once with `npx vsce login Tyhp`. Full token and publisher setup: [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

```bash
npx vsce publish --packagePath tyhp-0.8.4.vsix
```

Azure DevOps global personal access tokens are retired on 2026-12-01. After that, publish with Microsoft Entra ID: `npx vsce publish --packagePath tyhp-0.8.4.vsix --azure-credential`.

You can also upload the VSIX on the [publisher management page](https://marketplace.visualstudio.com/manage).

### Open VSX

Cursor installs from [open-vsx.org](https://open-vsx.org/extension/Tyhp/tyhp). The Open VSX namespace is the same `publisher` value, `Tyhp`.

Create an access token at [open-vsx.org/user-settings/tokens](https://open-vsx.org/user-settings/tokens). Pass it as `OVSX_PAT` or `npx ovsx publish -p <token>`. Before the first publish, create the namespace once:

```bash
npx ovsx create-namespace Tyhp
```

Publish the same VSIX:

```bash
npx ovsx publish tyhp-0.8.4.vsix
```

`ovsx` is not an npm dependency of this package; `npx` downloads it. Details: [Publishing Extensions](https://github.com/eclipse-openvsx/openvsx/wiki/Publishing-Extensions) (Open VSX).

## Implementation notes

### CLI resolution

The language server, tasks, and the XDebug proxy all use `resolveTyhpBinary()` rather than reading `tyhp.path` directly.

1. If `tyhp.path` is set, that value wins (absolute path, `~/…`, or a command name on `PATH`). A missing or non-file path shows an error on the status bar.
2. If `tyhp.path` is empty, activation and **Tyhp: Refresh Tyhp binary** search `PATH` for `tyhp` / `tyhp.exe`. A hit **writes** `tyhp.path` (User settings by default; Workspace / folder scope if that override already exists).

**Tyhp: Install / Update CLI** downloads from GitHub Releases:

| Mode | Location | Auto-update |
|------|----------|-------------|
| **Global** | Unix: `~/.local/bin/tyhp` (same as `scripts/install.sh`). Windows: `%LOCALAPPDATA%\Programs\tyhp\tyhp.exe` (same as `scripts/install.ps1`). | Never. Update only via this command. |
| **Extension only** | `{extension globalStorage}/cli/tyhp` (or `tyhp.exe`) | Yes, when `tyhp.binary.autoUpdate` is on **and** metadata shows this extension installed the file. |

After a successful install, `tyhp.path` and `tyhp.binary.installMode` (`path` \| `global` \| `extension`) are updated. Startup auto-update is delayed ~5s and skipped when a check ran in the last 6 hours (pin enforcement still runs).

Release artifacts come from [`tyhpproject/tyhp`](https://github.com/tyhpproject/tyhp/releases) — the same assets as `scripts/install.sh` / `scripts/release.sh`:

- **API:** `GET https://api.github.com/repos/tyhpproject/tyhp/releases?per_page=20` (first non-draft, **including prereleases**). Do not use `/releases/latest` (it hides prereleases). A pin uses `/releases/tags/{tag}`.
- **Asset names:** `tyhp-{os}-{arch}` or `tyhp-{os}-{arch}-fxdependent`, with `.exe` on Windows. `os` is `osx` \| `linux` \| `win`; `arch` is `x64` \| `arm64`. Published set: `tyhp-osx-arm64`, `tyhp-osx-x64`, `tyhp-linux-x64`, `tyhp-linux-arm64`, `tyhp-win-x64.exe`, and matching `-fxdependent` variants. There is no `win-arm64` asset.
- **Variant:** Extension-only always downloads the **self-contained** asset. Global matches the install scripts: **framework-dependent** when a .NET 9 runtime is detected, otherwise self-contained.
- **Checksums:** each release includes `checksums.txt` (GNU `sha256sum` lines from `scripts/release.sh`). The download is hashed with SHA-256 and compared; a missing checksums file or mismatch **aborts** the install.
- **Auth:** optional `GITHUB_TOKEN` or `GH_TOKEN` environment variable (GitHub API rate limits).

### Workspace index and project ownership

The extension indexes every `tyhp.json` under the workspace (`**/tyhp.json`, skipping `node_modules`, `vendor`, `.git`, `bin`, `obj`, `dist`, `build`). A file is **owned** by the project whose `include` / `exclude` globs match, resolved relative to that `tyhp.json` directory — the same matcher rules as `tyhp build`, including `../` overlays. Empty `include` owns nothing.

If several projects match, one owner is chosen (two type worlds are never merged): nearest ancestor `tyhp.json`, else fewest path hops, else shortest then lexicographic path.

**Tyhp: Initialize Project** runs `<resolved tyhp> init --yes` with the cwd set to the workspace folder that contains the file (or the first folder). `--tyhp-project` is not passed because that flag requires an existing file. After a successful init, the workspace index reloads.

### Language server process

Each owned `tyhp.json` gets its own child process over stdin/stdout:

```text
<resolved tyhp> language_server --quiet --stdio --tyhp-project=<path-to-that-project's-tyhp.json>
```

`--tyhp-project` is the owner file, or the forced `tyhp.projectPath`. Extra tokens from `tyhp.languageServer.args` are appended. Visible editors are started first when the `tyhp.languageServer.maxSessions` cap applies. Each client's document middleware keeps other projects' files off that server.

A session stops when no editor tab (including background tabs and diff tabs) shows a Tyhp file the project owns. `workspace.textDocuments` is not used for this because VS Code keeps documents there after their tab closes.

If the process exits before initialize completes, the client does not retry. A healthy server that later crashes is restarted with exponential backoff, then given up on after a few failures; a server that only stays up briefly does not reset that counter. Deactivation stops every session in parallel with shortened timeouts (tracked child SIGTERM, then SIGKILL).

### Tasks

| Task | Argv |
|------|------|
| `tyhp: build` | `build --quiet [--tyhp-project=<file>]` |
| `tyhp: lint` | `lint --quiet --format=json [--tyhp-project=<file>]` |

Build uses the `$tyhp` problem matcher for `file(line,col): error TYHP####: …` headers. Lint JSON is shown in the terminal.

### XDebug proxy

```text
<resolved tyhp> xdebug_proxy --tyhp-project=<path-to-tyhp.json> --ide-port=9003 --xdebug-port=9004 [--sourcemap-dir=<dir>] [--ide-key=<key>]
```

Ports: explicit `tyhp.xdebugProxy.*` settings win; otherwise `tyhp.json` `xdebugProxy.*`; otherwise **9003** (IDE) and **9004** (XDebug). `--sourcemap-dir` is omitted when unset so the CLI uses `output.path`. **Tyhp: Stop XDebug Proxy** sends SIGTERM and waits for the ports to be released.
