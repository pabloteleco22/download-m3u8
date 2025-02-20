import fs from 'node:fs/promises';

export class FileWrapper {
    async init() {
        let file;
        if (merge) {
            try {
                file = await fs.open(output_file, file_mode);
            } catch (e) {
                console.error(`Cannot open the output file ${e.message}`);
                process.exit(1);
            }
        } else {
            file = [];
            for (let i = 0; i < resources.length; ++i) {
                try {
                    const file_name_parts = output_file.split('/');
                    file_name_parts[file_name_parts.length - 1] = `${i}-${
                        file_name_parts[file_name_parts.length - 1]
                    }`;
                    const file_name = `${
                        output_file[0] === '/' ? '/' : ''
                    }${file_name_parts.join('/')}`;
                    file[i] = await fs.open(file_name, file_mode);
                } catch (e) {
                    console.error(`Cannot open the output file ${e.message}`);
                    process.exit(1);
                }
            }
        }
    }
}
