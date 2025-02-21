#!/usr/bin/env node

import { ArgumentParser } from 'argparse';

import { MergeBehaviour, DontMergeBehaviour } from './behaviours.js';

import { M3U8VideoDownloader } from './video-downloader.js';

const DEFAULT_PARALLEL_DOWNLOADS = 40;

const parser = new ArgumentParser({ description: 'TS downloader' });

parser.add_argument('-u', '--url', { required: true });
parser.add_argument('-b', '--base-url');
parser.add_argument('-o', '--out', { required: true });
parser.add_argument('-d', '--dont-merge', { action: 'store_true' });
parser.add_argument('-p', '--parallel_downloads', {
    type: 'int',
    default: DEFAULT_PARALLEL_DOWNLOADS,
});
parser.add_argument('-r', '--replace', {
    action: 'store_const',
    const: 'w',
    default: 'wx',
});

const args = parser.parse_args();
const { url, base_url, out: output_file, replace: file_mode } = args;
const parallel_downloads =
    args.parallel_downloads > 0
        ? args.parallel_downloads
        : DEFAULT_PARALLEL_DOWNLOADS;
const merge = !args.dont_merge;

const on_error_no_behaviour = (message) => {
    console.error(message);
    process.exit(1);
};

const downloader = new M3U8VideoDownloader(parallel_downloads);

let resources;
try {
    resources = await downloader.get_playlist(url, on_error_no_behaviour);
} catch (e) {
    console.error(e.message);
    process.exit(1);
}

const behaviour_args = {
    output_file,
    file_mode,
    resources: resources.length,
    constructor_error: on_error_no_behaviour,
};

const behaviour = merge
    ? new MergeBehaviour(behaviour_args)
    : new DontMergeBehaviour(behaviour_args);

const on_error_behaviour = async (message) => {
    console.error(message);
    await behaviour.process_error();
    process.exit(1);
};

let download;
try {
    download = await downloader.download({
        resources,
        base_url: base_url ?? new URL(url).origin,
        on_error: on_error_behaviour,
    });
} catch (e) {
    await on_error_behaviour(e.message);
}

try {
    await behaviour.process(download);
} catch (e) {
    await on_error_behaviour(e.message);
}
