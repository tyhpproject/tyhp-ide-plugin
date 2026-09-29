import assert from "node:assert/strict";
import { test } from "node:test";
import { sessionKeysEqual, sessionMapKey } from "./sessionKey";

test("sessionMapKey strips trailing slashes and uses POSIX separators", () => {
    assert.equal(sessionMapKey("/repo/pkg/tyhp.json"), "/repo/pkg/tyhp.json");
    assert.equal(sessionMapKey("/repo/pkg/tyhp.json/"), "/repo/pkg/tyhp.json");
    assert.equal(sessionMapKey("C:\\repo\\pkg\\tyhp.json"), "C:/repo/pkg/tyhp.json");
});

test("sessionMapKey lowercases when case-insensitive", () => {
    assert.equal(sessionMapKey("C:\\Repo\\Tyhp.json", true), "c:/repo/tyhp.json");
    assert.equal(sessionMapKey("/Repo/pkg/tyhp.json", false), "/Repo/pkg/tyhp.json");
});

test("sessionKeysEqual treats watcher and index paths as one session", () => {
    assert.equal(
        sessionKeysEqual("/repo/pkg/tyhp.json", "/repo/pkg/tyhp.json/"),
        true
    );
    assert.equal(
        sessionKeysEqual("C:\\repo\\pkg\\tyhp.json", "c:/repo/pkg/tyhp.json", true),
        true
    );
    assert.equal(sessionKeysEqual("/a/tyhp.json", "/b/tyhp.json"), false);
    assert.equal(sessionKeysEqual("/a/tyhp.json", undefined), false);
});
