import * as path from 'node:path';
import type { RsbuildPlugin } from '@rsbuild/core';
import chalk from 'chalk';
import { NodeSSH } from 'node-ssh';
import { getFileType } from '../utils';
import type {
    FileStruct,
    Hook,
    HookOption,
    PluginDeployOptions,
    SSHOption,
} from './types';

const PLUGIN_NAME = 'scope:deploy';

function createSSH(option: SSHOption) {
    const ssh = new NodeSSH();
    return ssh.connect({
        host: option.host,
        username: option.username,
        port: option.port,
        password: option.password,
        privateKeyPath: option.privateKey,
        tryKeyboard: true,
    });
}

async function uploadDir(ssh: NodeSSH, local: string, remote: string) {
    await ssh.putDirectory(local, remote, {
        recursive: true,
        concurrency: 10,
        validate: (itemPath) => {
            const baseName = path.basename(itemPath);
            return baseName.slice(0, 1) !== '.' && baseName !== 'node_modules';
        },
        tick: (localPath, _remotePath, error) => {
            if (error) {
                console.error(`${localPath}: `, error);
            }
        },
    });
}

async function uploadFiles(ssh: NodeSSH, option: FileStruct[]) {
    try {
        await ssh.putFiles(option);
    } catch (err) {
        console.error(err);
    }
}

async function execCommand(ssh: NodeSSH, cmds?: string[]) {
    if (!Array.isArray(cmds)) return;
    for (const cmd of cmds) {
        const result = await ssh.execCommand(cmd);
        console.log(chalk.greenBright('-'.repeat(20)));
        console.log(
            chalk.blueBright(
                `[stdout execCommand: ${cmd}]`,
                result.stdout || 'Success',
            ),
        );
        console.log(
            chalk.redBright(
                `[stderr execCommand: ${cmd}]`,
                result.stderr || 'No error',
            ),
        );
        console.log(chalk.greenBright('-'.repeat(20)));
    }
}

async function execHook<K extends keyof Hook>(
    hook: Hook[K][],
    option: HookOption,
) {
    for (const h of hook) {
        await h?.(option);
    }
}

export const pluginDeploy = (options: PluginDeployOptions): RsbuildPlugin => ({
    name: PLUGIN_NAME,

    setup(api) {
        api.onAfterBuild(async ({ environments }) => {
            const { web } = environments;
            const servers = Array.isArray(options.servers)
                ? options.servers
                : [options.servers];
            const startTime = Date.now();

            for (const server of servers) {
                const files: FileStruct[] = [];
                const dirs: FileStruct[] = [];
                const remoteDir = server.remote || options.baseRemote;

                const ssh = await createSSH(server.sshConfig);

                if (Array.isArray(server.include)) {
                    for (const localPath of server.include) {
                        let item: FileStruct | undefined;
                        const dataType =
                            Object.prototype.toString.call(localPath);
                        switch (dataType) {
                            case '[object Object]':
                                {
                                    item = {
                                        local: path.normalize(
                                            (localPath as any).local || '',
                                        ),
                                        remote: path.normalize(
                                            (localPath as any).remote ||
                                                server.remote ||
                                                options.baseRemote ||
                                                '',
                                        ),
                                    };
                                }
                                break;
                            case '[object String]':
                                {
                                    item = {
                                        local: path.normalize(
                                            localPath as string,
                                        ),
                                        remote: path.normalize(
                                            server.remote ||
                                                options.baseRemote ||
                                                '',
                                        ),
                                    };
                                }
                                break;
                            case '[object Function]':
                                {
                                    item = (localPath as any)(web);
                                }
                                break;
                        }

                        if (!item) continue;

                        if (item.local && item.remote) {
                            const localType = getFileType(item.local);
                            if (localType === 'file') {
                                files.push(item);
                            } else if (localType === 'dir') {
                                dirs.push(item);
                            } else {
                                console.log(
                                    chalk.yellowBright(
                                        `[${PLUGIN_NAME}: Warning] ${item.local}是不受支持的文件类型, 此任务将被忽略！`,
                                        item,
                                    ),
                                );
                            }
                        } else {
                            console.log(
                                chalk.yellowBright(
                                    `[${PLUGIN_NAME}: Warning] 未匹配到local或remote, 此任务将被忽略！`,
                                    item,
                                ),
                            );
                        }
                    }
                }

                await execHook(
                    [options.onBeforeUpload, server.onBeforeUpload],
                    {
                        ssh,
                        serverConfig: server,
                        pluginOption: options,
                        files,
                        dirs,
                    },
                );

                await execCommand(ssh, server.preCommands);

                if (files.length > 0) {
                    await uploadFiles(ssh, files);
                }

                if (remoteDir) {
                    if (dirs.length > 0) {
                        for (const dir of dirs) {
                            await uploadDir(ssh, dir.local, dir.remote);
                        }
                    } else {
                        await uploadDir(ssh, web.distPath, remoteDir);
                    }
                } else {
                    console.log(
                        chalk.yellowBright(
                            `[${PLUGIN_NAME}: Warning] 未匹配到remoteDir, 此任务将被忽略！`,
                            server,
                        ),
                    );
                }

                await execCommand(ssh, server.postCommands);

                await execHook([options.onAfterUpload, server.onAfterUpload], {
                    ssh,
                    serverConfig: server,
                    pluginOption: options,
                    files,
                    dirs,
                });

                ssh.dispose();
            }

            console.log(
                chalk.greenBright(
                    `[${PLUGIN_NAME}: Success] 部署成功！耗时：${Date.now() - startTime}ms`,
                ),
            );
        });
    },
});
