import { sessionKeysEqual } from "./sessionKey";

/** Whether a document's owner `tyhp.json` is this language-server session. */
export function isSessionOwner(
    sessionProjectFile: string,
    documentOwner: string | undefined,
    caseInsensitive = false
): boolean {
    return sessionKeysEqual(sessionProjectFile, documentOwner, caseInsensitive);
}
