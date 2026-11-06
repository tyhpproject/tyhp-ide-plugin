# Tyhp Language

Editor support for [Tyhp](https://tyhplang.com) `.tyhp` and `.tyhpdef` files in VS Code and Cursor: syntax highlighting, language server features, build and lint tasks, and breakpoints in `.tyhp` sources through XDebug.

To learn the language itself, see [tyhplang.com](https://tyhplang.com).

## Features

- **Syntax highlighting** for `.tyhp` and `.tyhpdef` files, including HTML outside `<?tyhp` blocks and Tyhp code blocks in Markdown.
- **Language server** (from the Tyhp CLI): diagnostics as you type, completion with auto-import, hover, go to definition, find references, rename, signature help, document and workspace symbols, semantic highlighting, code actions, and formatting.
- **Project aware**: each `tyhp.json` in the workspace gets its own language server, and a file is checked by the project whose `include` / `exclude` globs match it. Files that belong to no project get highlighting only.
- **CLI management**: finds `tyhp` on your `PATH`, or installs it from GitHub Releases and keeps it up to date.
- **Tasks**: `tyhp: build` and `tyhp: lint`, with build errors in the Problems panel.
- **Debugging**: starts the Tyhp XDebug proxy so the [PHP Debug](https://marketplace.visualstudio.com/items?itemName=xdebug.php-debug) extension stops on breakpoints in `.tyhp` files.
- **Status bar**: shows the current project, language server state, CLI health, and the XDebug proxy, with quick actions on click.
- **File icons** for `.tyhp` and `.tyhpdef`, plus an optional **Tyhp File Icons** theme.

## Requirements

- The **Tyhp CLI** (`tyhp`). If it is not on your `PATH`, run **Tyhp: Install / Update CLI**, or set `tyhp.path` to an existing binary. See [Installing Tyhp](https://tyhplang.com/intro_installation.html).
- A `tyhp.json` project file. Opening a Tyhp file outside any project offers **Tyhp: Initialize Project**, which runs `tyhp init`.
- For debugging: the [PHP Debug](https://marketplace.visualstudio.com/items?itemName=xdebug.php-debug) extension and XDebug.

## Getting started

1. Install the extension.
2. Open a folder that contains a `tyhp.json`, or run **Tyhp: Initialize Project** to create one.
3. Open a `.tyhp` file. The language server starts for that file's project, and the status bar shows **ready** once it is running.

If the status bar shows **CLI missing**, click it and choose **Install / Update CLI**.

## Debugging `.tyhp` files

1. Turn on sourcemaps in `tyhp.json` and build the project (**Terminal → Run Task… → tyhp: build**):

    ```json
    {
        "build": {
            "generateSourcemap": true
        }
    }
    ```

2. Point XDebug at the proxy's XDebug port (default `9004`):

    ```ini
    xdebug.mode = debug
    xdebug.client_host = 127.0.0.1
    xdebug.client_port = 9004
    ```

3. Run **Tyhp: Start XDebug Proxy**.
4. Add the **Tyhp: Listen for XDebug (via proxy)** launch configuration and start it. It listens on the proxy's IDE port (default `9003`).
5. Set a breakpoint in a `.tyhp` file and run your compiled PHP.

More detail: [Source map generation](https://tyhplang.com/cli_sourcemapGeneration.html) and [XDebug proxy](https://tyhplang.com/cli_xdebugProxy.html).

## Commands

| Command | What it does |
|---------|--------------|
| **Tyhp: Install / Update CLI** | Download the Tyhp CLI from GitHub Releases, globally or for this extension only |
| **Tyhp: Refresh Tyhp binary** | Search `PATH` for `tyhp` again |
| **Tyhp: Reveal CLI Path** | Show which `tyhp` binary is in use |
| **Tyhp: Restart Language Server** | Restart every running Tyhp language server |
| **Tyhp: Initialize Project** | Run `tyhp init` to create a `tyhp.json` |
| **Tyhp: Start / Stop / Restart XDebug Proxy** | Control the proxy used for debugging |

## Settings

| Setting | Description |
|---------|-------------|
| `tyhp.path` | Path to the `tyhp` CLI. Filled in automatically when the CLI is found on `PATH` or installed by the extension |
| `tyhp.projectPath` | Use a single `tyhp.json` instead of every project in the workspace |
| `tyhp.languageServer.args` | Extra arguments for `tyhp language_server` |
| `tyhp.languageServer.trace` | Log language server messages: `off`, `messages`, or `verbose` |
| `tyhp.languageServer.maxSessions` | Maximum number of language servers running at once (default 8) |
| `tyhp.diagnostics.enable` | Show diagnostics in the Problems panel |
| `tyhp.completion.autoImport` | Offer auto-import in completion and code actions |
| `tyhp.binary.installMode` | How the CLI was installed: `path`, `global`, or `extension` (set automatically) |
| `tyhp.binary.autoUpdate` | Keep an extension-installed CLI up to date |
| `tyhp.binary.pinnedVersion` | Keep an extension-installed CLI on one release tag, such as `805.1.2-beta.4` |
| `tyhp.xdebugProxy.idePort` | Port PHP Debug listens on (default 9003, or `xdebugProxy.idePort` in `tyhp.json`) |
| `tyhp.xdebugProxy.xdebugPort` | Port XDebug connects to (default 9004, or `xdebugProxy.xdebugPort` in `tyhp.json`) |
| `tyhp.xdebugProxy.sourceMapDir` | Directory of `.php.map` files, if not the project's output path |

## Troubleshooting

- **No diagnostics or completion in a file**: the file may not match any project's `include` globs. The status bar shows **not in a Tyhp project** in that case.
- **Language server errors**: check **Output → Tyhp Language Server**. Set `tyhp.languageServer.trace` to `messages` to log the protocol. An outdated CLI can fail to start the server; update it with **Tyhp: Install / Update CLI**.
- **Breakpoints stay in the `.php` file**: enable `build.generateSourcemap` and rebuild. Proxy logs are in **Output → Tyhp XDebug Proxy**.
- **Proxy port already in use**: stop the other process, or change `tyhp.xdebugProxy.idePort` / `tyhp.xdebugProxy.xdebugPort`.

## Links

- [Tyhp documentation](https://tyhplang.com)
- [Language server reference](https://tyhplang.com/cli_languageServer.html)
- [Report an issue](https://github.com/tyhpproject/tyhp-ide-plugin/issues)
- [Contributing and building from source](https://github.com/tyhpproject/tyhp-ide-plugin/blob/main/vscode/DEVELOPMENT.md)
