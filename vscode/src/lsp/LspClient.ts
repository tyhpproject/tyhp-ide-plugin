import * as vscode from "vscode";
import * as settings from "../config/settings";
import { LspClientState, LspSession, LspSessionHost } from "./LspSession";
import { rankOwnersForSessions, sessionsToStop } from "./sessionCap";
import { sessionMapKey } from "./sessionKey";
import { DebouncedTask, SerialQueue } from "./serialQueue";

export type { LspClientState };

const OUTPUT_CHANNEL_NAME = "Tyhp Language Server";
const ENSURE_OPEN_DEBOUNCE_MS = 75;

let instance: LspClient | undefined;

export interface LspWorkspaceLookup {
    ownerOfUri(uri: vscode.Uri): { projectFilePath: string } | undefined;
}

/**
 * One language client per owned `tyhp.json`, started lazily when a file that
 * project owns is opened. Idle-stopped when no open Tyhp documents remain for
 * that project, and capped so a monorepo cannot spawn one `tyhp` per package.
 */
export class LspClient implements vscode.Disposable, LspSessionHost {
    readonly output: vscode.OutputChannel;
    private readonly disposables: vscode.Disposable[] = [];
    private readonly sessions = new Map<string, LspSession>();
    private readonly lifecycle = new SerialQueue();
    private readonly stateEmitter = new vscode.EventEmitter<LspClientState>();
    private readonly ensureOpenTask: DebouncedTask;
    private disposedFlag = false;
    private missingBinaryNotified = false;
    private gaveUpNotified = false;
    private workspace: LspWorkspaceLookup | undefined;
    private readonly caseInsensitive = process.platform === "win32";

    readonly onDidChangeClientState = this.stateEmitter.event;

    constructor() {
        this.output = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
        this.ensureOpenTask = new DebouncedTask(ENSURE_OPEN_DEBOUNCE_MS, () => this.ensureOpenDocuments());
        this.disposables.push(
            this.output,
            this.stateEmitter,
            this.ensureOpenTask,
            vscode.workspace.onDidChangeConfiguration((e) => {
                if (
                    e.affectsConfiguration("tyhp.path") ||
                    e.affectsConfiguration("tyhp.projectPath") ||
                    e.affectsConfiguration("tyhp.languageServer.args") ||
                    e.affectsConfiguration("tyhp.languageServer.maxSessions")
                ) {
                    void this.restart();
                } else if (e.affectsConfiguration("tyhp.languageServer.trace")) {
                    this.applyTrace();
                }
            }),
            vscode.workspace.onDidChangeWorkspaceFolders(() => {
                void this.restart();
            }),
            vscode.workspace.onDidOpenTextDocument(() => {
                this.ensureOpenTask.schedule();
            }),
            vscode.workspace.onDidCloseTextDocument(() => {
                this.ensureOpenTask.schedule();
            }),
            vscode.window.onDidChangeVisibleTextEditors(() => {
                this.ensureOpenTask.schedule();
            }),
            vscode.window.onDidChangeActiveTextEditor(() => {
                this.fireStateForActiveEditor();
            })
        );
    }

    bindWorkspace(workspace: LspWorkspaceLookup): void {
        this.workspace = workspace;
    }

    disposed = (): boolean => this.disposedFlag;

    ownerProjectFileOf(uri: vscode.Uri): string | undefined {
        return this.workspace?.ownerOfUri(uri)?.projectFilePath;
    }

    get currentState(): LspClientState {
        const session = this.sessionForActiveEditor();
        return session?.currentState ?? "stopped";
    }

    /**
     * Start sessions for documents that are already open (activation / CLI refresh).
     * Does not start a server for every discovered `tyhp.json`.
     */
    async start(): Promise<void> {
        await this.ensureOpenDocuments();
    }

    async ensureSessionForActiveDocument(): Promise<void> {
        const document = vscode.window.activeTextEditor?.document;
        if (document) {
            await this.ensureSessionForDocument(document);
        }
    }

    async ensureSessionForDocument(document: vscode.TextDocument): Promise<void> {
        if (this.disposedFlag || document.languageId !== "tyhp" || document.uri.scheme !== "file") {
            return;
        }
        const owner = this.workspace?.ownerOfUri(document.uri);
        if (!owner) {
            return;
        }
        await this.ensureSession(owner.projectFilePath);
    }

    async ensureOpenDocuments(): Promise<void> {
        return this.lifecycle.enqueue(async () => {
            if (this.disposedFlag) {
                return;
            }
            const keep = this.ownersToKeep();
            const idle = sessionsToStop([...this.sessions.keys()], keep);
            for (const key of idle) {
                const session = this.sessions.get(key);
                this.sessions.delete(key);
                this.output.appendLine(
                    `[${sessionLabel(key)}] Stopping language server (idle, over concurrency cap, or no open documents).`
                );
                await session?.stop();
            }
            for (const key of keep) {
                const existing = this.sessions.get(key);
                if (existing) {
                    await existing.start();
                    continue;
                }
                const projectFilePath = this.projectFileForKey(key);
                if (projectFilePath) {
                    await this.ensureSessionUnlocked(projectFilePath);
                }
            }
            this.fireStateForActiveEditor();
        });
    }

    async restart(): Promise<void> {
        await this.lifecycle.enqueue(async () => {
            if (this.disposedFlag) {
                return;
            }
            this.gaveUpNotified = false;
            const running = [...this.sessions.values()];
            for (const session of running) {
                await session.restart();
            }
        });
        await this.ensureOpenDocuments();
    }

    async restartSession(projectFilePath: string): Promise<void> {
        await this.restartSessions([projectFilePath]);
    }

    async restartSessions(projectFilePaths: readonly string[]): Promise<void> {
        const keys = projectFilePaths.map((p) => this.keyOf(p));
        await this.lifecycle.enqueue(async () => {
            if (this.disposedFlag) {
                return;
            }
            for (const key of keys) {
                const session = this.sessions.get(key);
                if (session) {
                    await session.restart();
                }
            }
        });
        await this.ensureOpenDocuments();
    }

    async stopIdleSessions(): Promise<void> {
        await this.ensureOpenDocuments();
    }

    async stop(): Promise<void> {
        this.disposedFlag = true;
        this.ensureOpenTask.cancel();
        return this.lifecycle.enqueue(async () => {
            const running = [...this.sessions.values()];
            this.sessions.clear();
            for (const session of running) {
                await session.stop();
            }
            this.stateEmitter.fire("stopped");
        });
    }

    dispose(): void {
        this.disposedFlag = true;
        this.ensureOpenTask.cancel();
        void this.stop();
        for (const d of this.disposables) {
            d.dispose();
        }
        this.disposables.length = 0;
    }

    async offerMissingBinary(detail: string): Promise<void> {
        if (this.missingBinaryNotified) {
            return;
        }
        this.missingBinaryNotified = true;
        this.output.appendLine(
            `Language server not started (CLI unavailable). Use the Tyhp status bar or “Tyhp: Install / Update CLI”. ${detail}`
        );
    }

    async giveUpStarting(detail: string): Promise<void> {
        if (this.gaveUpNotified) {
            this.output.appendLine(detail);
            this.fireStateForActiveEditor();
            return;
        }
        this.gaveUpNotified = true;
        this.output.appendLine(detail);
        this.fireStateForActiveEditor();
        const pick = await vscode.window.showErrorMessage(
            detail,
            "Install / Update CLI",
            "Open Settings",
            "Show Output"
        );
        if (pick === "Install / Update CLI") {
            await vscode.commands.executeCommand("tyhp.installCli");
        } else if (pick === "Open Settings") {
            await vscode.commands.executeCommand("workbench.action.openSettings", "tyhp.path");
        } else if (pick === "Show Output") {
            this.output.show(true);
        }
    }

    onSessionState(_projectFilePath: string, _state: LspClientState): void {
        this.fireStateForActiveEditor();
    }

    private async ensureSession(projectFilePath: string): Promise<void> {
        return this.lifecycle.enqueue(() => this.ensureSessionUnlocked(projectFilePath));
    }

    private async ensureSessionUnlocked(projectFilePath: string): Promise<void> {
        if (this.disposedFlag) {
            return;
        }
        const key = this.keyOf(projectFilePath);
        let session = this.sessions.get(key);
        if (!session) {
            session = new LspSession(projectFilePath, this);
            this.sessions.set(key, session);
        }
        await session.start();
    }

    private ownersToKeep(): string[] {
        return rankOwnersForSessions({
            visibleOwners: this.ownedProjectKeys(visibleTyhpDocuments()),
            openOwners: this.ownedProjectKeys(vscode.workspace.textDocuments),
            maxSessions: settings.getLanguageServerMaxSessions(),
        });
    }

    private ownedProjectKeys(documents: readonly vscode.TextDocument[]): string[] {
        const owners: string[] = [];
        const seen = new Set<string>();
        for (const document of documents) {
            if (document.languageId !== "tyhp" || document.uri.scheme !== "file") {
                continue;
            }
            const owner = this.workspace?.ownerOfUri(document.uri);
            if (!owner) {
                continue;
            }
            const key = this.keyOf(owner.projectFilePath);
            if (seen.has(key)) {
                continue;
            }
            seen.add(key);
            owners.push(key);
        }
        return owners;
    }

    private projectFileForKey(key: string): string | undefined {
        const session = this.sessions.get(key);
        if (session) {
            return session.projectFilePath;
        }
        for (const document of [...visibleTyhpDocuments(), ...vscode.workspace.textDocuments]) {
            if (document.languageId !== "tyhp" || document.uri.scheme !== "file") {
                continue;
            }
            const owner = this.workspace?.ownerOfUri(document.uri);
            if (owner && this.keyOf(owner.projectFilePath) === key) {
                return owner.projectFilePath;
            }
        }
        return undefined;
    }

    private keyOf(projectFilePath: string): string {
        return sessionMapKey(projectFilePath, this.caseInsensitive);
    }

    private sessionForActiveEditor(): LspSession | undefined {
        const uri = vscode.window.activeTextEditor?.document.uri;
        if (!uri) {
            return undefined;
        }
        const owner = this.ownerProjectFileOf(uri);
        return owner ? this.sessions.get(this.keyOf(owner)) : undefined;
    }

    private applyTrace(): void {
        for (const session of this.sessions.values()) {
            session.applyTrace();
        }
        this.output.appendLine(`LSP trace: ${settings.getLanguageServerTrace()}`);
    }

    private fireStateForActiveEditor(): void {
        this.stateEmitter.fire(this.currentState);
    }
}

function visibleTyhpDocuments(): vscode.TextDocument[] {
    const documents: vscode.TextDocument[] = [];
    const seen = new Set<string>();
    for (const editor of vscode.window.visibleTextEditors) {
        const uri = editor.document.uri.toString();
        if (seen.has(uri)) {
            continue;
        }
        seen.add(uri);
        documents.push(editor.document);
    }
    return documents;
}

function sessionLabel(projectFilePath: string): string {
    const posix = projectFilePath.replace(/\\/g, "/");
    const parts = posix.split("/");
    return parts.length >= 2 ? parts[parts.length - 2] : posix;
}

export function registerLspClient(context: vscode.ExtensionContext): LspClient {
    instance = new LspClient();
    context.subscriptions.push(instance);
    return instance;
}

export function getLspClient(): LspClient | undefined {
    return instance;
}
