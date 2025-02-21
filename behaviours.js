import { Semaphore } from './semaphore.js';

import fs from 'node:fs/promises';

export class MergeBehaviour {
    constructor({ output_file, file_mode, constructor_error }) {
        this.file_sem = new Semaphore(0);
        this.file_writen = false;

        fs.open(output_file, file_mode)
            .then((fd) => {
                fd.file_name = output_file;
                this.file = fd;
                this.file_sem.free();
            })
            .catch((e) => {
                this.file_sem.free();
                constructor_error(`Cannot open the output file ${e.message}`);
            });
    }

    async process(download) {
        await this.file_sem.wait();
        this.file_sem.free();

        await this.file.appendFile(Buffer.concat(download));
        this.file_writen = true;

        await this.file.close();
    }

    async process_error() {
        await this.file_sem.wait();

        const file_name = this.file.file_name;

        if (this.file) {
            await this.file.close();
            if (!this.file_writen) {
                await fs.rm(file_name);
            }
        }

        this.file_sem.free();
    }
}

export class DontMergeBehaviour {
    constructor({ output_file, file_mode, resources, constructor_error }) {
        this.resources = resources;

        this.file_sem = new Semaphore(0);
        this.files = [];
        this.files_writen = new Array(resources).fill(false);

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
                    fd.file_name = file_name;
                    this.files[i] = fd;
                    ++open_files;
                    if (open_files >= resources) {
                        this.file_sem.free();
                    }
                })
                .catch((e) => {
                    this.file_sem.free();
                    constructor_error(
                        `Cannot open the output file: ${e.message}`
                    );
                });
        }
    }

    async process(download) {
        await this.file_sem.wait();
        this.file_sem.free();

        if (download.length != this.files.length)
            throw Error(
                'The downloads number and the files number are differents'
            );

        for (let i = 0; i < this.resources; ++i) {
            this.files[i].appendFile(download[i]);
            await this.files[i].close();
            this.files_writen[i] = true;
        }
    }

    async process_error() {
        await this.file_sem.wait();

        for (let i = 0; i < this.resources; ++i) {
            const file = this.files[i];
            const file_name = file.file_name;
            if (!this.files_writen[i]) {
                await file.close();
                await fs.rm(file_name);
            }
        }

        this.file_sem.free();
    }
}
