import assert from "node:assert/strict";
import { test } from "node:test";
import {
    ABSOLUTE_MAX_CONCURRENT_LSP_SESSIONS,
    DEFAULT_MAX_CONCURRENT_LSP_SESSIONS,
    parseMaxSessions,
    rankOwnersForSessions,
    sessionsToStop,
} from "./sessionCap";

test("parseMaxSessions clamps to 1..32", () => {
    assert.equal(parseMaxSessions(undefined), DEFAULT_MAX_CONCURRENT_LSP_SESSIONS);
    assert.equal(parseMaxSessions("8"), DEFAULT_MAX_CONCURRENT_LSP_SESSIONS);
    assert.equal(parseMaxSessions(0), 1);
    assert.equal(parseMaxSessions(3.9), 3);
    assert.equal(parseMaxSessions(99), ABSOLUTE_MAX_CONCURRENT_LSP_SESSIONS);
    assert.equal(parseMaxSessions(NaN), DEFAULT_MAX_CONCURRENT_LSP_SESSIONS);
});

test("rankOwnersForSessions prefers visible owners and respects the cap", () => {
    assert.deepEqual(
        rankOwnersForSessions({
            visibleOwners: ["/a/tyhp.json", "/b/tyhp.json"],
            openOwners: ["/a/tyhp.json", "/c/tyhp.json", "/d/tyhp.json"],
            maxSessions: 2,
        }),
        ["/a/tyhp.json", "/b/tyhp.json"]
    );
    assert.deepEqual(
        rankOwnersForSessions({
            visibleOwners: ["/a/tyhp.json"],
            openOwners: ["/b/tyhp.json", "/c/tyhp.json"],
            maxSessions: 2,
        }),
        ["/a/tyhp.json", "/b/tyhp.json"]
    );
});

test("rankOwnersForSessions does not start a server per open background tab", () => {
    const open = Array.from({ length: 40 }, (_, i) => `/pkg${i}/tyhp.json`);
    const keep = rankOwnersForSessions({
        visibleOwners: ["/pkg0/tyhp.json"],
        openOwners: open,
        maxSessions: 8,
    });
    assert.equal(keep.length, 8);
    assert.equal(keep[0], "/pkg0/tyhp.json");
});

test("sessionsToStop drops running servers that are not in the keep set", () => {
    assert.deepEqual(
        sessionsToStop(["/a/tyhp.json", "/b/tyhp.json", "/c/tyhp.json"], ["/a/tyhp.json"]),
        ["/b/tyhp.json", "/c/tyhp.json"]
    );
});
