/**
 * FIFO async mutex. Start/stop/restart of language-server processes must not
 * overlap: a second spawn while `stop()` is still running is how `tyhp`
 * children leak.
 *
 * Not re-entrant — work already on the queue must not `enqueue` and await the
 * same queue.
 */
export class SerialQueue {
    private tail: Promise<void> = Promise.resolve();

    enqueue<T>(work: () => Promise<T>): Promise<T> {
        const run = this.tail.then(work, work);
        this.tail = run.then(
            () => undefined,
            () => undefined
        );
        return run;
    }
}

/**
 * Coalesce bursts of events (session restore, `tyhp.json` storms) into one run.
 */
export class DebouncedTask implements DisposableLike {
    private timer: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly delayMs: number,
        private readonly run: () => void | Promise<void>
    ) {}

    schedule(): void {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            this.timer = undefined;
            void this.run();
        }, this.delayMs);
    }

    cancel(): void {
        if (this.timer !== undefined) {
            clearTimeout(this.timer);
            this.timer = undefined;
        }
    }

    dispose(): void {
        this.cancel();
    }
}

interface DisposableLike {
    dispose(): void;
}
