# Contributing to the Tyhp IDE plugins

Issues and pull requests are welcome. Read this before opening either.

## Legal

You will need to complete a Contributor License Agreement (CLA). Briefly, this agreement testifies that you are granting us permission to use the submitted change according to the terms of the project's license, and that the work being submitted is under appropriate copyright. Upon submitting a pull request, you will automatically be given instructions on how to sign the CLA.

These plugins are under the [Apache License 2.0](LICENSE.txt).

## What this repository is

Clone [tyhp-ide-plugin](https://github.com/tyhpproject/tyhp-ide-plugin). `vscode/` is the VS Code / Cursor extension. `phpstorm/` is the PhpStorm plugin. They are siblings so the PhpStorm Gradle build can copy TextMate grammars and icons from `../vscode`.

The compiler, CLI, and language server live in [tyhp](https://github.com/tyhpproject/tyhp). Human documentation is at [tyhplang.com](https://tyhplang.com). CLI binaries are downloaded from [tyhp releases](https://github.com/tyhpproject/tyhp/releases).

## Tests

### VS Code

```bash
cd vscode
npm ci
npm test
npm run package
```

### PhpStorm

JDK 17 or newer is required to run Gradle. The plugin compiles with a JDK 25 toolchain.

```bash
cd phpstorm
./gradlew unitTest
./gradlew buildPlugin
```

## Pull requests

- Target `main`.
- Keep changes focused. A grammar edit in `vscode/syntaxes/` is picked up by the PhpStorm copy task. Do not add a second grammar tree under `phpstorm/`.
- Do not publish to the VS Code Marketplace, Open VSX, or the JetBrains Marketplace from a pull request.

## Code of conduct

See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
