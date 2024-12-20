import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getFileType } from '../src/utils';

describe('Utils', () => {
    // 创建临时测试文件和目录
    const tmpDir = path.join(process.cwd(), 'tmp_test');
    const tmpFile = path.join(tmpDir, 'test.txt');

    // 在所有测试前创建测试文件和目录
    beforeAll(() => {
        // 创建临时目录
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }
        // 创建临时文件
        fs.writeFileSync(tmpFile, 'test content');
    });

    // 在所有测试后清理
    afterAll(() => {
        // 清理临时文件
        if (fs.existsSync(tmpFile)) {
            fs.unlinkSync(tmpFile);
        }
        // 清理临时目录
        if (fs.existsSync(tmpDir)) {
            fs.rmdirSync(tmpDir);
        }
    });

    test("getFileType should return 'file' for files", () => {
        expect(getFileType(tmpFile)).toBe('file');
    });

    test("getFileType should return 'dir' for directories", () => {
        expect(getFileType(tmpDir)).toBe('dir');
    });

    test("getFileType should return 'other' for non-existent paths", () => {
        expect(() => getFileType('non-existent-path')).toThrow();
    });
});
