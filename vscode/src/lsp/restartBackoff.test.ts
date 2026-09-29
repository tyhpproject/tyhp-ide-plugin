import assert from "node:assert/strict";
import { test } from "node:test";
import {
    DEFAULT_RESTART_INITIAL_MS,
    DEFAULT_RESTART_MAX_MS,
    DEFAULT_STABLE_RUNNING_MS,
    RestartBackoff,
    nextRestartDelayMs,
    shouldResetBackoffAfterRunning,
    shouldScheduleCrashRestart,
} from "./restartBackoff";

test("first crash uses the initial delay", () => {
    assert.equal(nextRestartDelayMs(1), DEFAULT_RESTART_INITIAL_MS);
    assert.equal(nextRestartDelayMs(0), DEFAULT_RESTART_INITIAL_MS);
});

test("delays double until the cap", () => {
    assert.equal(nextRestartDelayMs(2), 2_000);
    assert.equal(nextRestartDelayMs(3), 4_000);
    assert.equal(nextRestartDelayMs(4), 8_000);
    assert.equal(nextRestartDelayMs(5), 16_000);
    assert.equal(nextRestartDelayMs(6), DEFAULT_RESTART_MAX_MS);
    assert.equal(nextRestartDelayMs(20), DEFAULT_RESTART_MAX_MS);
});

test("RestartBackoff increments then resets after a healthy start", () => {
    const backoff = new RestartBackoff(100, 800);
    assert.equal(backoff.nextDelayMs(), 100);
    assert.equal(backoff.nextDelayMs(), 200);
    assert.equal(backoff.nextDelayMs(), 400);
    assert.equal(backoff.nextDelayMs(), 800);
    assert.equal(backoff.nextDelayMs(), 800);
    assert.equal(backoff.consecutiveFailures, 5);
    backoff.reset();
    assert.equal(backoff.consecutiveFailures, 0);
    assert.equal(backoff.nextDelayMs(), 100);
});

test("a server that never reached Running is not restarted", () => {
    assert.equal(
        shouldScheduleCrashRestart({ neverStarted: true, consecutiveFailures: 0 }),
        false
    );
    assert.equal(
        shouldScheduleCrashRestart({ neverStarted: true, consecutiveFailures: 2 }),
        false
    );
});

test("backoff does not reset when the server only ran briefly", () => {
    assert.equal(shouldResetBackoffAfterRunning(0), false);
    assert.equal(shouldResetBackoffAfterRunning(1_000), false);
    assert.equal(shouldResetBackoffAfterRunning(DEFAULT_STABLE_RUNNING_MS - 1), false);
    assert.equal(shouldResetBackoffAfterRunning(DEFAULT_STABLE_RUNNING_MS), true);
    assert.equal(shouldResetBackoffAfterRunning(120_000), true);
});

test("a running server is retried until the consecutive-failure cap", () => {
    assert.equal(
        shouldScheduleCrashRestart({ neverStarted: false, consecutiveFailures: 0 }),
        true
    );
    assert.equal(
        shouldScheduleCrashRestart({ neverStarted: false, consecutiveFailures: 2 }),
        true
    );
    assert.equal(
        shouldScheduleCrashRestart({ neverStarted: false, consecutiveFailures: 3 }),
        false
    );
    assert.equal(
        shouldScheduleCrashRestart({
            neverStarted: false,
            consecutiveFailures: 1,
            maxFailures: 1,
        }),
        false
    );
});
