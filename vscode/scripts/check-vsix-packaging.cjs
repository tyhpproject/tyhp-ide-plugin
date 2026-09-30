const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const extRoot = path.join(__dirname, "..");
const vsce = path.join(extRoot, "node_modules", ".bin", "vsce");
if (!fs.existsSync(vsce)) {
    console.error("vsce not found; run npm install in vscode/");
    process.exit(1);
}

const result = spawnSync(vsce, ["ls"], { encoding: "utf8", cwd: extRoot });
if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "vsce ls failed\n");
    process.exit(result.status === null ? 1 : result.status);
}

const files = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

if (!files.includes("out/extension.js")) {
    console.error("VSIX file list is missing out/extension.js (esbuild bundle).");
    console.error(files.join("\n"));
    process.exit(1);
}

const extraOut = files.filter((file) => file.startsWith("out/") && file !== "out/extension.js");
if (extraOut.length > 0) {
    console.error("VSIX must ship only out/extension.js; extra out/ files:");
    console.error(extraOut.join("\n"));
    process.exit(1);
}

console.log(`VSIX file list OK (${files.length} files); out/ contains only extension.js`);
