import {
    DEFAULT_MAX_CONCURRENT_LSP_SESSIONS,
    parseMaxSessions,
} from "../config/settingsCore";

export {
    ABSOLUTE_MAX_CONCURRENT_LSP_SESSIONS,
    DEFAULT_MAX_CONCURRENT_LSP_SESSIONS,
    parseMaxSessions,
} from "../config/settingsCore";

/**
 * Owners that may have a live `tyhp language_server`. Visible editors win so
 * background tabs / session restore / indexer-opened documents cannot spawn
 * unbounded processes.
 */
export function rankOwnersForSessions(options: {
    visibleOwners: readonly string[];
    openOwners: readonly string[];
    maxSessions: number;
}): string[] {
    const max = parseMaxSessions(options.maxSessions, DEFAULT_MAX_CONCURRENT_LSP_SESSIONS);
    const result: string[] = [];
    const seen = new Set<string>();
    for (const key of options.visibleOwners) {
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(key);
        if (result.length >= max) {
            return result;
        }
    }
    for (const key of options.openOwners) {
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        result.push(key);
        if (result.length >= max) {
            return result;
        }
    }
    return result;
}

export function sessionsToStop(runningKeys: readonly string[], keepKeys: readonly string[]): string[] {
    const keep = new Set(keepKeys);
    return runningKeys.filter((key) => !keep.has(key));
}
