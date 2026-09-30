# Tyhp IDE plugins

VS Code (and Cursor) and PhpStorm clients for [Tyhp](https://github.com/tyhpproject/tyhp). Both are named **Tyhp Language** (`tyhp-lang`). They launch the compiler’s `tyhp language_server` and download CLI binaries from [tyhp releases](https://github.com/tyhpproject/tyhp/releases).

Human documentation is at [tyhplang.com](https://tyhplang.com).

Licensed under the [Apache License 2.0](LICENSE.txt).

## Layout

| Path | What it is |
|------|-----------|
| `vscode/` | VS Code / Cursor extension (`tyhp-lang.tyhp`). Canonical TextMate grammars and file icons. |
| `phpstorm/` | PhpStorm plugin (`com.tyhp.lang`). Gradle copies grammars and icons from `../vscode` at build time. |

`vscode/` and `phpstorm/` are siblings. Keep that layout so the PhpStorm build can resolve `../vscode`.

## Clone

```bash
git clone https://github.com/tyhpproject/tyhp-ide-plugin.git
cd tyhp-ide-plugin
```

## VS Code

From `vscode/`:

```bash
npm ci
npm test
npm run package
```

`npm test` compiles TypeScript and runs the unit tests. `npm run package` writes a local VSIX. It does not publish to the Marketplace or Open VSX.

Install steps are in [`vscode/README.md`](vscode/README.md).

## PhpStorm

Gradle needs JDK 17 or newer. The plugin compiles with a JDK 25 toolchain, which Gradle downloads when that JDK is not already installed. The first build also downloads the PhpStorm platform it compiles against.

From `phpstorm/`:

```bash
./gradlew unitTest
./gradlew buildPlugin
```

`unitTest` is the JVM test suite. `buildPlugin` writes `phpstorm/build/distributions/tyhp-lang-<version>.zip`. It does not publish to the JetBrains Marketplace.

Install steps are in [`phpstorm/README.md`](phpstorm/README.md).

## Relation to the compiler

The language server stays in the [tyhp](https://github.com/tyhpproject/tyhp) repository. These clients do not compile the compiler. Point `tyhp.path` at a `tyhp` binary, or install one from [tyhp releases](https://github.com/tyhpproject/tyhp/releases).
