import { Semaphore } from './semaphore.js';

export class M3U8VideoDownloader {
    constructor(n_parrallel) {
        this.n_parrallel = n_parrallel;
    }

    async get_playlist(url, on_error) {
        console.log('Downloading playlist...');
        let resources = await fetch(url)
            .then(async (response) => {
                if (!response.ok) {
                    await on_error(`Fetch failed: ${response.status}`);
                }
                return response.text();
            })
            .catch((error) => {
                on_error(
                    `There was a problem with the request: ${error.message}`
                );
            });

        resources = resources
            .replace(/\n?#.*/g, '')
            .split('\n')
            .filter((e) => e != '');
        return resources;
    }

    async download({ resources, base_url, on_error }) {
        const bufferArray = [];

        const download_sem = new Semaphore(this.n_parrallel);
        const total_sem = new Semaphore(0);

        let downloaded_resources = 0;

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

            await download_sem.wait();

            console.log(`Downloading ${full_resource}...`);
            fetch(full_resource)
                .then(async (response) => {
                    if (!response.ok) {
                        await on_error(
                            `\nFetch failed: ${JSON.stringify(
                                {
                                    status: response.status,
                                    response: response.url,
                                },
                                null,
                                4
                            )}\n`
                        );
                    }

                    return response.arrayBuffer();
                })
                .then((body) => {
                    bufferArray[i] = Buffer.from(body);
                    download_sem.free();
                    ++downloaded_resources;
                    if (downloaded_resources >= resources.length) {
                        total_sem.free();
                    }
                })
                .catch(async (error) => {
                    await on_error(
                        `There was a problem with the request ${full_resource}: ${error.message}`
                    );
                });
        }

        await total_sem.wait();

        return bufferArray;
    }
}
