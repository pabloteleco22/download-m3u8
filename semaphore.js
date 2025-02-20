export class Semaphore {
    constructor(n) {
        this.n = n;
        this.promise_callback = (resolve, reject) => {};
        this.blocked = [];
    }

    async wait() {
        this.n -= 1;

        return new Promise((resolve, reject) => {
            this.blocked.push(resolve);
            this.try_next();
        });
    }

    free() {
        this.n += 1;
        this.try_next();
    }

    try_next() {
        if (this.n >= 0 && this.blocked.length > 0) {
            const [resolve] = this.blocked.splice(0, 1);
            resolve();
        }
    }
}
