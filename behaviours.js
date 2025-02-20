import { Semaphore } from './semaphore.js';

import fs from 'node:fs/promises';

export class MergeBehaviour {
    constructor({ output_file, file_mode }) {
        this.file_sem = new Semaphore(0);

        fs.open(output_file, file_mode)
            .then((fd) => {
                this.file = fd;
                this.file_sem.free();
            })
            .catch((e) => {
                const error_message = `Cannot open the output file ${e.message}`;
                console.error(error_message);
                throw Error(error_message);
            });
    }

    async process(download) {
        await this.file_sem.wait();

        this.file.appendFile(Buffer.concat(download));

        this.file.close();
    }
}

export class DontMergeBehaviour {
    constructor({ output_file, file_mode, resources }) {
        this.resources = resources.length;

        this.file_sem = new Semaphore(0);

        this.files = [];

        let open_files = 0;
        for (let i = 0; i < this.resources; ++i) {
            const file_name_parts = output_file.split('/');
            file_name_parts[file_name_parts.length - 1] = `${i}-${
                file_name_parts[file_name_parts.length - 1]
            }`;
            const file_name = `${
                output_file[0] === '/' ? '/' : ''
            }${file_name_parts.join('/')}`;
            fs.open(file_name, file_mode)
                .then((fd) => {
                    this.files[i] = fd;
                    ++open_files;
                    if (open_files >= resources.length) this.file_sem.free();
                })
                .catch((e) => {
                    const error_message = `Cannot open the output file: ${e.message}`;
                    console.error(error_message);
                    throw Error(error_message);
                });
        }
    }

    async process(download) {
        if (download.length != this.files.length)
            throw Error(
                'The downloads number and the files number are differents'
            );

        for (let i = 0; i < this.resources; ++i) {
            this.files[i].appendFile(download[i]);
            this.files[i].close();
        }
    }
}
