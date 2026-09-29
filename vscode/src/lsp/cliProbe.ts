import { execFile } from "child_process";
import { promisify } from "util";
import { classifyLanguageServerHelp, type LanguageServerHelpClass } from "./cliCapability";

const execFileAsync = promisify(execFile);

const HELP_TIMEOUT_MS = 8_000;

export type HelpExec = (
    file: string,
    args: readonly string[],
    options: { timeout: number; encoding: BufferEncoding; windowsHide: boolean }
) => Promise<{ stdout: string; stderr: string }>;

const probeCache = new Map<string, LanguageServerHelpClass>();

export function clearLanguageServerProbeCache(): void {
    probeCache.clear();
}

/**
 * Runs `tyhp help --subject=language_server` and classifies the output.
 * Timeouts and spawn errors are `unknown` so we still attempt to start.
 * Successful classifications are cached per executable so opening many
 * projects does not spawn a `tyhp help` process for each session.
 */
export async function probeLanguageServerSupport(
    executable: string,
    exec?: HelpExec
): Promise<LanguageServerHelpClass> {
    if (!exec) {
        const cached = probeCache.get(executable);
        if (cached !== undefined) {
            return cached;
        }
    }
    const runner = exec ?? (execFileAsync as HelpExec);
    const result = await probeOnce(executable, runner);
    if (!exec && result !== "unknown") {
        probeCache.set(executable, result);
    }
    return result;
}

async function probeOnce(executable: string, exec: HelpExec): Promise<LanguageServerHelpClass> {
    try {
        const { stdout, stderr } = await exec(executable, ["help", "--subject=language_server"], {
            timeout: HELP_TIMEOUT_MS,
            encoding: "utf8",
            windowsHide: true,
        });
        return classifyLanguageServerHelp(`${stdout ?? ""}\n${stderr ?? ""}`);
    } catch (err) {
        const text = helpTextFromExecError(err);
        if (text !== "") {
            return classifyLanguageServerHelp(text);
        }
        return "unknown";
    }
}

function helpTextFromExecError(err: unknown): string {
    if (err === null || typeof err !== "object") {
        return "";
    }
    const record = err as { stdout?: unknown; stderr?: unknown };
    const stdout = typeof record.stdout === "string" ? record.stdout : "";
    const stderr = typeof record.stderr === "string" ? record.stderr : "";
    return `${stdout}\n${stderr}`;
}
