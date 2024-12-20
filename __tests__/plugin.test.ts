import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { pluginDeploy } from '../src/core/plugin';
import type { PluginDeployOptions } from '../src/core/types';

describe('Plugin', () => {
    let mockApi: any;
    let mockOptions: PluginDeployOptions;

    beforeEach(() => {
        // 模拟 api
        mockApi = {
            onAfterBuild: mock((callback: (environments: any) => void) =>
                callback({
                    environments: { web: { distPath: 'dist' } },
                }),
            ),
        };

        // 基础配置
        mockOptions = {
            servers: {
                sshConfig: {
                    host: 'test.host',
                    port: 22,
                    username: 'test',
                    password: 'test',
                },
            },
        };
    });

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

    test('should create plugin with correct name', () => {
        const plugin = pluginDeploy(mockOptions);
        expect(plugin.name).toBe('scope:deploy');
    });

    test('should have setup function', () => {
        const plugin = pluginDeploy(mockOptions);
        expect(typeof plugin.setup).toBe('function');
    });

    test('should handle single server config', () => {
        const plugin = pluginDeploy(mockOptions);
        expect(plugin).toBeDefined();
    });

    test('should handle multiple server configs', () => {
        const multiServerOptions: PluginDeployOptions = {
            servers: [
                {
                    sshConfig: {
                        host: 'test1.host',
                        port: 22,
                        username: 'test1',
                        password: 'test1',
                    },
                },
                {
                    sshConfig: {
                        host: 'test2.host',
                        port: 22,
                        username: 'test2',
                        password: 'test2',
                    },
                },
            ],
        };
        const plugin = pluginDeploy(multiServerOptions);
        expect(plugin).toBeDefined();
    });

    test('should execute deploy task on build completion', async () => {
        const plugin = pluginDeploy(mockOptions);
        await plugin.setup(mockApi);
        expect(mockApi.onAfterBuild).toHaveBeenCalled();
    });

    test('should handle empty server config', async () => {
        const plugin = pluginDeploy({ servers: [] });
        await plugin.setup(mockApi);
        expect(mockApi.onAfterBuild).toHaveBeenCalled();
    });
});
