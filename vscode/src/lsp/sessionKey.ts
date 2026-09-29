import { toPosix } from "../workspace/pathUtils";

/**
 * Map key for one language-server session. Watcher `fsPath` and index paths
 * must land on the same session or the client starts a second `tyhp` process
 * for the same `tyhp.json`.
 */
export function sessionMapKey(projectFilePath: string, caseInsensitive = false): string {
    let posix = toPosix(projectFilePath).trim();
    while (posix.endsWith("/") && posix !== "/") {
        posix = posix.slice(0, -1);
    }
    return caseInsensitive ? posix.toLowerCase() : posix;
}

export function sessionKeysEqual(
    left: string | undefined,
    right: string | undefined,
    caseInsensitive = false
): boolean {
    if (left === undefined || right === undefined) {
        return false;
    }
    return sessionMapKey(left, caseInsensitive) === sessionMapKey(right, caseInsensitive);
}
