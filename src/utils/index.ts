import * as fs from 'node:fs';

export function getFileType(str: string) {
    const stat = fs.statSync(str);
    return stat.isFile() ? 'file' : stat.isDirectory() ? 'dir' : 'other';
}
