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
    readonly signalCode?: NodeJS.Signals | null;
    kill(signal?: NodeJS.Signals): boolean;
    on(event: "exit" | "error", listener: (...args: unknown[]) => void): void;
}

/** A child killed by a signal has `exitCode === null` and `signalCode` set. */
export function hasExited(child: TrackedChild): boolean {
    return child.exitCode !== null || (child.signalCode ?? null) !== null;
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

/**
 * SIGTERM, then SIGKILL after `termTimeoutMs`. Resolves `true` once the child
 * has exited (or there was none) and `false` if it is still alive after
 * `killTimeoutMs`; never rejects.
 */
export async function stopTrackedProcess(
    child: TrackedChild | undefined,
    options: { termTimeoutMs?: number; killTimeoutMs?: number } = {}
): Promise<boolean> {
    if (!child || hasExited(child)) {
        return true;
    }
    const termMs = options.termTimeoutMs ?? STOP_TERM_TIMEOUT_MS;
    const killMs = options.killTimeoutMs ?? STOP_KILL_TIMEOUT_MS;
    try {
        child.kill("SIGTERM");
    } catch {
        return hasExited(child);
    }
    try {
        await waitForProcessExit(child, termMs);
        return true;
    } catch {
        // SIGTERM ignored or hung — escalate. Still Node ChildProcess.kill.
    }
    if (hasExited(child)) {
        return true;
    }
    try {
        child.kill("SIGKILL");
    } catch {
        return hasExited(child);
    }
    try {
        await waitForProcessExit(child, killMs);
        return true;
    } catch {
        return hasExited(child);
    }
}

export function waitForProcessExit(child: TrackedChild, timeoutMs: number): Promise<void> {
    if (hasExited(child)) {
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
