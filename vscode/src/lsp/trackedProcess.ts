import { spawn, ChildProcess } from "node:child_process";

export const STOP_TERM_TIMEOUT_MS = 3_000;
export const STOP_KILL_TIMEOUT_MS = 2_000;

/**
 * Minimal process surface so tests do not spawn a real `tyhp`.
 * `kill` is Node `ChildProcess.kill`, not a shell `kill` / `killall`.
 */
export interface TrackedChild {
    readonly pid?: number;
    readonly exitCode: number | null;
    kill(signal?: NodeJS.Signals): boolean;
    on(event: "exit" | "error", listener: (...args: unknown[]) => void): void;
}

/**
 * Spawn `tyhp language_server` in the extension-host process group so it is
 * reaped with the host. `detached` must stay false: a detached child survives
 * `LanguageClient.stop()` and is the leak the user saw.
 *
 * stdout/stdin are left for vscode-languageclient; stderr is not consumed here
 * (the client attaches a listener so the pipe cannot fill and block).
 */
export function spawnLanguageServerProcess(
    command: string,
    args: readonly string[],
    cwd?: string
): ChildProcess {
    return spawn(command, [...args], {
        cwd,
        env: process.env,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
        detached: false,
        shell: false,
    });
}

export async function stopTrackedProcess(
    child: TrackedChild | undefined,
    options: { termTimeoutMs?: number; killTimeoutMs?: number } = {}
): Promise<void> {
    if (!child || child.exitCode !== null) {
        return;
    }
    const termMs = options.termTimeoutMs ?? STOP_TERM_TIMEOUT_MS;
    const killMs = options.killTimeoutMs ?? STOP_KILL_TIMEOUT_MS;
    try {
        child.kill("SIGTERM");
    } catch {
        return;
    }
    try {
        await waitForProcessExit(child, termMs);
        return;
    } catch {
        // SIGTERM ignored or hung — escalate. Still Node ChildProcess.kill.
    }
    if (child.exitCode !== null) {
        return;
    }
    try {
        child.kill("SIGKILL");
    } catch {
        return;
    }
    await waitForProcessExit(child, killMs);
}

export function waitForProcessExit(child: TrackedChild, timeoutMs: number): Promise<void> {
    if (child.exitCode !== null) {
        return Promise.resolve();
    }
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error(`Process did not exit within ${timeoutMs}ms`));
        }, timeoutMs);
        child.on("exit", () => {
            clearTimeout(timer);
            resolve();
        });
    });
}
