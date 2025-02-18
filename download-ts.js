#!/usr/bin/env node

import fs from 'node:fs/promises';
import { ArgumentParser } from 'argparse';

const parser = new ArgumentParser({ description: 'TS downloader' });

parser.add_argument('-u', '--url', { required: true });
parser.add_argument('-b', '--base-url');
parser.add_argument('-o', '--out', { required: true });
parser.add_argument('-d', '--dont-merge', { action: 'store_false' });
parser.add_argument('-r', '--replace', {
    action: 'store_const',
    const: 'w',
    default: 'wx',
});

const {
    url,
    base_url,
    out: output_file,
    dont_merge: merge,
    replace: file_mode,
} = parser.parse_args();

const BASE_URL = base_url ?? new URL(url).origin;

let resources = await fetch(url)
    .then((response) => {
        if (!response.ok) {
            console.error(`Fetch failed: ${response.status}`);
            process.exit(1);
        }
        return response.text();
    })
    .catch((error) => {
        console.log('There was a problem with the request:' + error.message);
        process.exit(1);
    });

resources = resources
    .replace(/\n?#.*/g, '')
    .split('\n')
    .filter((e) => e != '');

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

const bufferArray = [];

for (let i = 0; i < resources.length; ++i) {
    let resource = resources[i];
    if (BASE_URL.endsWith('/')) {
        if (resources[i].startsWith('/')) {
            resource = resources[i].substring(1);
        }
    } else if (!resources[i].startsWith('/')) {
        if (!resources[i].startsWith('/')) {
            resource = `/${resources[i]}`;
        }
    }

    const full_resource = `${BASE_URL}${resource}`;

    console.log(`Downloading ${full_resource}...`);
    const data = await fetch(full_resource)
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
    bufferArray[i] = Buffer.from(data);
    if (!merge) {
        file[i].appendFile(bufferArray[i]);
        file[i].close();
    }
}

if (merge) {
    file.appendFile(Buffer.concat(bufferArray));

    file.close();
}
