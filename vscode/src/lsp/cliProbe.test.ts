import assert from "node:assert/strict";
import { test } from "node:test";
import { clearLanguageServerProbeCache, probeLanguageServerSupport } from "./cliProbe";

test("probe classifies stub help from stdout as unimplemented", async () => {
    const result = await probeLanguageServerSupport("/bin/tyhp", async () => ({
        stdout: "Note: The language server action is not yet implemented (Story 19).\n",
        stderr: "",
    }));
    assert.equal(result, "unimplemented");
});

test("probe classifies current help as available", async () => {
    const result = await probeLanguageServerSupport("/bin/tyhp", async () => ({
        stdout: "Start the Tyhp Language Server Protocol (LSP) server\n--tcp not yet implemented\n",
        stderr: "",
    }));
    assert.equal(result, "available");
});

test("probe treats spawn failure with no output as unknown", async () => {
    const result = await probeLanguageServerSupport("/missing/tyhp", async () => {
        throw new Error("ENOENT");
    });
    assert.equal(result, "unknown");
});

test("probe reads stub text from an exec error's stdout", async () => {
    const result = await probeLanguageServerSupport("/bin/tyhp", async () => {
        const err = new Error("Command failed") as Error & { stdout: string; stderr: string };
        err.stdout = "The language server is not yet implemented (Story 19).\n";
        err.stderr = "";
        throw err;
    });
    assert.equal(result, "unimplemented");
});

test("injected exec is not cached so each probe runs", async () => {
    clearLanguageServerProbeCache();
    let n = 0;
    const exec = async () => {
        n += 1;
        return {
            stdout:
                n === 1
                    ? "The language server is not yet implemented (Story 19).\n"
                    : "Start the Tyhp Language Server Protocol\n",
            stderr: "",
        };
    };
    assert.equal(await probeLanguageServerSupport("/bin/tyhp", exec), "unimplemented");
    assert.equal(await probeLanguageServerSupport("/bin/tyhp", exec), "available");
    assert.equal(n, 2);
});
