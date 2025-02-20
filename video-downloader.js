export class M3U8VideoDownloader {
    constructor(n_parrallel) {
        this.n_parrallel = n_parrallel;
    }

    async download({ url, base_url, merge = true }) {
        let resources = await fetch(url)
            .then((response) => {
                if (!response.ok) {
                    console.error(`Fetch failed: ${response.status}`);
                    process.exit(1);
                }
                return response.text();
            })
            .catch((error) => {
                console.error(
                    'There was a problem with the request:' + error.message
                );
                process.exit(1);
            });

        resources = resources
            .replace(/\n?#.*/g, '')
            .split('\n')
            .filter((e) => e != '');

        const bufferArray = [];

        const semaphore = new Semaphore(this.n_parrallel);

        for (let i = 0; i < resources.length; ++i) {
            let resource = resources[i];
            if (base_url.endsWith('/')) {
                if (resources[i].startsWith('/')) {
                    resource = resources[i].substring(1);
                }
            } else if (!resources[i].startsWith('/')) {
                if (!resources[i].startsWith('/')) {
                    resource = `/${resources[i]}`;
                }
            }

            const full_resource = `${base_url}${resource}`;

            await semaphore.wait();

            console.log(`Downloading ${full_resource}...`);
            const data = fetch(full_resource)
                .then((response) => {
                    if (!response.ok) {
                        console.error(`Fetch failed: ${response.status}`);
                        console.error(response);
                        process.exit(1);
                    }
                    return response.arrayBuffer();
                })
                .catch((error) => {
                    console.log(
                        `There was a problem with the request ${full_resource}: ${error.message}`
                    );
                    process.exit(1);
                });
            semaphore.free();
            bufferArray[i] = Buffer.from(data);
        }

        if (merge) {
            return Buffer.concat(bufferArray);
        } else {
            return bufferArray;
        }
    }
}

class Semaphore {
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
        if (this.n > 0 && this.blocked.length > 0) {
            const [resolve] = this.blocked.splice(0, 1);
            resolve();
        }
    }
}
