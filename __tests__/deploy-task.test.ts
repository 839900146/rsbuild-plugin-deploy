import {
    afterEach,
    beforeEach,
    describe,
    expect,
    mock,
    spyOn,
    test,
} from 'bun:test';
import * as fs from 'node:fs';
import type { PluginDeployOptions, ServerOption } from '../src/core/types';

describe('DeployTask', () => {
    beforeEach(() => {
        mock.module('node-ssh', () => ({
            NodeSSH: mock(() => ({
                connect: mock(() => Promise.resolve()),
                putDirectory: mock(() => Promise.resolve()),
                putFiles: mock(() => Promise.resolve()),
                execCommand: mock(() => ({
                    stdout: 'execCommand Success',
                    stderr: 'execCommand Error',
                })),
                dispose: mock(() => Promise.resolve()),
            })),
        }));
    });

    afterEach(() => {
        mock.restore();
    });

    const mockServerConfig: ServerOption = {
        sshConfig: {
            host: 'test.host',
            port: 22,
            username: 'test',
            password: 'test',
        },
        remote: '/remote/path',
    };

    const mockPluginOption: PluginDeployOptions = {
        servers: mockServerConfig,
        baseRemote: '/base/remote',
    };

    test('should create instance with correct config', async () => {
        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, mockPluginOption);
        expect(task).toBeDefined();
    });

    test('should use server remote over baseRemote', async () => {
        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, mockPluginOption);
        // @ts-expect-error 访问私有属性进行测试
        expect(task.remoteDir).toBe('/remote/path');
    });

    test('should fallback to baseRemote when server remote is not provided', async () => {
        const serverConfigWithoutRemote = {
            ...mockServerConfig,
            remote: undefined,
        };
        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(
            serverConfigWithoutRemote,
            mockPluginOption,
        );
        // @ts-expect-error 访问私有属性进行测试
        expect(task.remoteDir).toBe('/base/remote');
    });

    test('should execute deploy task', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };
        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, mockPluginOption);
        // 直接等待 execute 方法执行，并验证它不会抛出错误
        await expect(task.execute(mockWeb)).resolves.toBeUndefined();
    });

    test('should handle include files configuration', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        fs.writeFileSync('test.txt', 'test');
        fs.writeFileSync('local.txt', 'local');

        const { DeployTask } = await import('../src/core/deploy-task');

        const task = new DeployTask(
            {
                ...mockServerConfig,
                include: [
                    './test.txt',
                    { local: './local.txt', remote: '/remote/local.txt' },
                ],
            },
            mockPluginOption,
        );

        await expect(task.execute(mockWeb)).resolves.toBeUndefined();

        fs.rmSync('test.txt');
        fs.rmSync('local.txt');
    });

    test('should handle function type include', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        fs.writeFileSync('test.txt', 'test');

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(
            {
                ...mockServerConfig,
                include: [
                    (context) => ({
                        local: './test.txt',
                        remote: `/remote/${context.distPath}/test.txt`,
                    }),
                ],
            },
            mockPluginOption,
        );
        await expect(task.execute(mockWeb)).resolves.toBeUndefined();

        fs.rmSync('test.txt');
    });

    test('should execute hooks', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        const beforeUploadMock = mock(() => Promise.resolve());
        const afterUploadMock = mock(() => Promise.resolve());

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, {
            ...mockPluginOption,
            onBeforeUpload: beforeUploadMock,
            onAfterUpload: afterUploadMock,
        });

        await task.execute(mockWeb);

        expect(beforeUploadMock).toHaveBeenCalled();
        expect(afterUploadMock).toHaveBeenCalled();
    });

    test('should handle SSH connection error', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        mock.module('node-ssh', () => ({
            NodeSSH: mock(() => ({
                connect: mock(() =>
                    Promise.reject(new Error('Connection failed')),
                ),
                dispose: mock(() => Promise.resolve()),
            })),
        }));

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, mockPluginOption);

        try {
            await task.execute(mockWeb);
        } catch (error) {
            expect(error).toBeDefined();
        }
    });

    test('should handle command execution error', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        mock.module('node-ssh', () => ({
            NodeSSH: mock(() => ({
                connect: mock(() => Promise.resolve()),
                putDirectory: mock(() => Promise.resolve()),
                execCommand: mock(() =>
                    Promise.reject(new Error('Command failed')),
                ),
                dispose: mock(() => Promise.resolve()),
            })),
        }));

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(
            {
                ...mockServerConfig,
                preCommands: ['echo "pre"'],
                postCommands: ['echo "post"'],
            },
            mockPluginOption,
        );

        await expect(task.execute(mockWeb)).rejects.toThrow('Command failed');
    });

    test('should execute preCommands and postCommands', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        // 模拟 execCommand 函数
        const execCommandMock = mock(() => ({
            stdout: 'Success',
            stderr: undefined,
        }));

        mock.module('node-ssh', () => ({
            NodeSSH: mock(() => ({
                connect: mock(() => Promise.resolve()),
                putDirectory: mock(() => Promise.resolve()),
                execCommand: execCommandMock,
                dispose: mock(() => Promise.resolve()),
            })),
        }));

        const { DeployTask } = await import('../src/core/deploy-task');

        const task = new DeployTask(
            {
                ...mockServerConfig,
                preCommands: ['ll -s'],
                postCommands: ['ls -l', 'ps -ef'],
            },
            mockPluginOption,
        );

        await task.execute(mockWeb);

        // 验证 execCommand 被调用了两次,分别执行 preCommands 和 postCommands
        expect(execCommandMock).toHaveBeenCalledTimes(3);
        expect(execCommandMock).toHaveBeenCalledWith('ll -s');
        expect(execCommandMock).toHaveBeenCalledWith('ls -l');
        expect(execCommandMock).toHaveBeenCalledWith('ps -ef');
    });

    test('should handle putDirectory error', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        mock.module('node-ssh', () => ({
            NodeSSH: mock(() => ({
                connect: mock(() => Promise.resolve()),
                putDirectory: mock(() =>
                    Promise.reject(new Error('Upload failed')),
                ),
                execCommand: mock(() => ({
                    stdout: mock(() => Promise.resolve()),
                    stderr: mock(() => Promise.resolve()),
                })),
                dispose: mock(() => Promise.resolve()),
            })),
        }));

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, mockPluginOption);

        await expect(task.execute(mockWeb)).rejects.toThrow('Upload failed');
    });

    test('should handle putFiles error', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        fs.writeFileSync('test.txt', 'test');

        mock.module('node-ssh', () => ({
            NodeSSH: mock(() => ({
                connect: mock(() => Promise.resolve()),
                putFiles: mock(() =>
                    Promise.reject(new Error('File upload failed')),
                ),
                execCommand: mock(() => ({
                    stdout: mock(() => Promise.resolve()),
                    stderr: mock(() => Promise.resolve()),
                })),
                dispose: mock(() => Promise.resolve()),
            })),
        }));

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(
            {
                ...mockServerConfig,
                include: ['./test.txt'],
            },
            mockPluginOption,
        );

        await expect(task.execute(mockWeb)).rejects.toThrow(
            'File upload failed',
        );

        fs.rmSync('test.txt');
    });

    test('should handle hook function errors', async () => {
        const mockWeb: any = {
            distPath: 'dist',
        };

        const beforeUploadMock = mock(() =>
            Promise.reject(new Error('Hook error')),
        );

        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, {
            ...mockPluginOption,
            onBeforeUpload: beforeUploadMock,
        });

        await expect(task.execute(mockWeb)).rejects.toThrow('Hook error');
    });

    test('should log command results correctly', async () => {
        const { DeployTask } = await import('../src/core/deploy-task');
        const task = new DeployTask(mockServerConfig, mockPluginOption);
        const consoleSpy = spyOn(console, 'log');

        // @ts-expect-error 访问私有方法进行测试
        task.logCommandResult('test-cmd', {
            stdout: 'success output',
            stderr: 'error output',
        });

        expect(consoleSpy).toHaveBeenCalledTimes(4);
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('test-cmd'),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('success output'),
        );
        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('error output'),
        );
    });

    test('should handle invalid remote directory', async () => {
        const { DeployTask } = await import('../src/core/deploy-task');
        const invalidConfig = {
            ...mockServerConfig,
            remote: '',
        };
        const task = new DeployTask(invalidConfig, {
            ...mockPluginOption,
            baseRemote: '',
        });
        const consoleSpy = spyOn(console, 'log');

        await task.execute({ distPath: 'dist' } as any);

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('No remoteDir found'),
        );
    });

    test('should handle invalid include items', async () => {
        const { DeployTask } = await import('../src/core/deploy-task');
        const invalidConfig = {
            ...mockServerConfig,
            include: [null, undefined, 123] as any[],
        };
        const task = new DeployTask(invalidConfig, mockPluginOption);
        const consoleSpy = spyOn(console, 'log');

        await task.execute({ distPath: 'dist' } as any);

        // 验证是否至少有一次调用包含了指定的消息
        const calls = consoleSpy.mock.calls;
        const hasExpectedCall = calls.some((call) =>
            call[0]
                ?.toString()
                .includes(
                    'is an unsupported file type, this task will be skipped!',
                ),
        );
        expect(hasExpectedCall).toBe(true);
    });
});
