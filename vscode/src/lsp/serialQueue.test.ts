import assert from "node:assert/strict";
import { test } from "node:test";
import { DebouncedTask, SerialQueue } from "./serialQueue";

test("SerialQueue runs tasks in order and does not overlap", async () => {
    const queue = new SerialQueue();
    const order: number[] = [];
    const first = queue.enqueue(async () => {
        await new Promise((r) => setTimeout(r, 20));
        order.push(1);
        return "a";
    });
    const second = queue.enqueue(async () => {
        order.push(2);
        return "b";
    });
    assert.deepEqual(await Promise.all([first, second]), ["a", "b"]);
    assert.deepEqual(order, [1, 2]);
});

test("SerialQueue continues after a rejected task", async () => {
    const queue = new SerialQueue();
    await assert.rejects(queue.enqueue(async () => {
        throw new Error("boom");
    }), /boom/);
    assert.equal(await queue.enqueue(async () => 7), 7);
});

test("DebouncedTask coalesces bursts into one run", async () => {
    let runs = 0;
    const task = new DebouncedTask(30, () => {
        runs += 1;
    });
    task.schedule();
    task.schedule();
    task.schedule();
    await new Promise((r) => setTimeout(r, 80));
    assert.equal(runs, 1);
    task.dispose();
});

test("DebouncedTask cancel prevents the run", async () => {
    let runs = 0;
    const task = new DebouncedTask(20, () => {
        runs += 1;
    });
    task.schedule();
    task.cancel();
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(runs, 0);
});
