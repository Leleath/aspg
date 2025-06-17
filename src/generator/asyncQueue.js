import logger from "./logger";

class AsyncQueue {
    constructor() {
        this.maxConcurrent = 8;
        this.queue = [];
        this.executing = new Set();
        this.completed = 0;
        this.totalAdded = 0;
    }

    add(task) {
        this.queue.push(task);
        this.totalAdded++;
        this._printProgress();
        this._processQueue();
    }

    async _processQueue() {
        while (this.queue.length > 0 && this.executing.size < this.maxConcurrent) {
            const task = this.queue.shift();
            const promise = task()
                .finally(() => {
                    this.executing.delete(promise);
                    this.completed++;
                    this._printProgress();
                    this._processQueue();
                });

            this.executing.add(promise);
        }
    }

    async waitUntilAllDone() {
        while (this.executing.size > 0 || this.queue.length > 0) {
            await Promise.race(this.executing);
        }
        this._printProgress(true);
    }

    _printProgress(isFinal = false) {
        const remaining = this.queue.length + this.executing.size;
        const progress = `${this.completed}/${this.totalAdded}`;

        if (isFinal) {
            logger.info(`All tasks completed`);
        } else {
            logger.info(`In Progress: ${progress} | Remaining: ${remaining}`);
        }
    }
}

export default new AsyncQueue();