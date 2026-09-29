import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { test } from "node:test";
import { stopTrackedProcess, TrackedChild, waitForProcessExit } from "./trackedProcess";

class FakeChild extends EventEmitter implements TrackedChild {
    pid = 99;
    exitCode: number | null = null;
    signals: NodeJS.Signals[] = [];
    ignoreTerm = false;

    kill(signal?: NodeJS.Signals): boolean {
        const sig = signal ?? "SIGTERM";
        this.signals.push(sig);
        if (this.ignoreTerm && sig === "SIGTERM") {
            return true;
        }
        this.exit(0);
        return true;
    }

    exit(code: number | null = 0): void {
        if (this.exitCode !== null) {
            return;
        }
        this.exitCode = code;
        this.emit("exit", code, null);
    }
}

test("stopTrackedProcess is a no-op when the child already exited", async () => {
    const child = new FakeChild();
    child.exit(0);
    await stopTrackedProcess(child);
    assert.deepEqual(child.signals, []);
});

test("stopTrackedProcess sends SIGTERM and waits for exit", async () => {
    const child = new FakeChild();
    await stopTrackedProcess(child);
    assert.deepEqual(child.signals, ["SIGTERM"]);
    assert.equal(child.exitCode, 0);
});

test("stopTrackedProcess escalates to SIGKILL when SIGTERM is ignored", async () => {
    const child = new FakeChild();
    child.ignoreTerm = true;
    await stopTrackedProcess(child, { termTimeoutMs: 30, killTimeoutMs: 30 });
    assert.deepEqual(child.signals, ["SIGTERM", "SIGKILL"]);
    assert.equal(child.exitCode, 0);
});

test("waitForProcessExit resolves when the child is already dead", async () => {
    const child = new FakeChild();
    child.exit(1);
    await waitForProcessExit(child, 10);
});
