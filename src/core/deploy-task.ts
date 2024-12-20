import * as path from 'node:path';
import type { EnvironmentContext } from '@rsbuild/core';
import chalk from 'chalk';
import { NodeSSH } from 'node-ssh';
import { getFileType } from '../utils';
import type {
    FileStruct,
    HookOption,
    PluginDeployOptions,
    ServerOption,
} from './types';

export class DeployTask {
    private ssh: NodeSSH;
    private files: FileStruct[] = [];
    private dirs: FileStruct[] = [];
    private readonly serverConfig: ServerOption;
    private readonly pluginOption: PluginDeployOptions;
    private readonly remoteDir: string;

    constructor(serverConfig: ServerOption, pluginOption: PluginDeployOptions) {
        this.ssh = new NodeSSH();
        this.serverConfig = serverConfig;
        this.pluginOption = pluginOption;
        this.remoteDir = serverConfig.remote || pluginOption.baseRemote || '';
    }

    private async connect() {
        const { sshConfig } = this.serverConfig;
        try {
            await this.ssh.connect({
                host: sshConfig.host,
                username: sshConfig.username,
                port: sshConfig.port,
                password: sshConfig.password,
                privateKeyPath: sshConfig.privateKey,
                tryKeyboard: true,
            });
        } catch (error: unknown) {
            this.handleError(error, 'SSH connection failed');
        }
    }

    private async processIncludes(web: EnvironmentContext) {
        const { include } = this.serverConfig;
        if (!Array.isArray(include)) return;

        for (const localPath of include) {
            const item = this.resolveFileStruct(localPath, web);
            if (!item) continue;

            await this.validateAndAddFileStruct(item);
        }
    }

    private resolveFileStruct(
        localPath:
            | string
            | FileStruct
            | ((data: EnvironmentContext) => FileStruct),
        web: EnvironmentContext,
    ): FileStruct | undefined {
        const dataType = Object.prototype.toString.call(localPath);

        switch (dataType) {
            case '[object Object]':
                return this.normalizeFileStruct(
                    (localPath as FileStruct).local,
                    (localPath as FileStruct).remote,
                );
            case '[object String]':
                return this.normalizeFileStruct(
                    localPath as string,
                    this.remoteDir,
                );
            case '[object Function]':
                return (localPath as (data: EnvironmentContext) => FileStruct)(
                    web,
                );
            default:
                console.log(
                    chalk.yellow(
                        `${localPath} is an unsupported file type, this task will be skipped!`,
                    ),
                );
                return undefined;
        }
    }

    private normalizeFileStruct(local: string, remote: string): FileStruct {
        return {
            local: path.normalize(local || ''),
            remote: path.normalize(remote || this.remoteDir || ''),
        };
    }

    private async validateAndAddFileStruct(item: FileStruct) {
        if (!item.local || !item.remote) {
            console.log(
                chalk.yellow(
                    'Missing local or remote path, this task will be skipped!',
                    item,
                ),
            );
            return;
        }

        const localType = getFileType(item.local);
        switch (localType) {
            case 'file':
                this.files.push(item);
                break;
            case 'dir':
                this.dirs.push(item);
                break;
            default:
                console.log(
                    chalk.yellow(
                        `${item.local} is an unsupported file type, this task will be skipped!`,
                    ),
                );
        }
    }

    private async uploadFiles() {
        if (this.files.length === 0) return;

        try {
            await this.ssh.putFiles(this.files);
        } catch (error: unknown) {
            this.handleError(error, 'File upload failed');
        }
    }

    private async uploadDirectories(web: EnvironmentContext) {
        if (!this.remoteDir) {
            console.log(
                chalk.yellow(
                    'No remoteDir found, directory upload will be skipped!',
                ),
            );
            return;
        }

        const uploadOptions = {
            recursive: true,
            concurrency: 10,
            validate: (itemPath: string) => {
                const baseName = path.basename(itemPath);
                return (
                    baseName.slice(0, 1) !== '.' && baseName !== 'node_modules'
                );
            },
            tick: (
                localPath: string,
                _remotePath: string,
                error: Error | null,
            ) => {
                if (error) {
                    console.error(`${localPath}: `, error);
                }
            },
        };

        try {
            if (this.dirs.length > 0) {
                for (const dir of this.dirs) {
                    await this.ssh.putDirectory(
                        dir.local,
                        dir.remote,
                        uploadOptions,
                    );
                }
            } else {
                // Upload dist directory by default
                await this.ssh.putDirectory(
                    web.distPath,
                    this.remoteDir,
                    uploadOptions,
                );
            }
        } catch (error: unknown) {
            this.handleError(error, 'Directory upload failed');
        }
    }

    private async execCommands(commands?: string[]) {
        if (!Array.isArray(commands)) return;

        for (const cmd of commands) {
            try {
                const result = await this.ssh.execCommand(cmd);
                this.logCommandResult(cmd, result);
            } catch (error: unknown) {
                this.handleError(error, `Command execution failed [${cmd}]`);
            }
        }
    }

    private logCommandResult(
        cmd: string,
        result: { stdout: string; stderr: string },
    ) {
        console.log(chalk.green('-'.repeat(20)));
        console.log(chalk.blue(`[stdout ${cmd}]`, result.stdout || 'Success'));
        console.log(chalk.red(`[stderr ${cmd}]`, result.stderr || 'No error'));
        console.log(chalk.green('-'.repeat(20)));
    }

    private async execHooks(
        hooks: Array<
            ((option: HookOption) => void | Promise<void>) | undefined
        >,
    ) {
        const hookOption: HookOption = {
            ssh: this.ssh,
            files: this.files,
            dirs: this.dirs,
            serverConfig: this.serverConfig,
            pluginOption: this.pluginOption,
        };

        for (const hook of hooks) {
            if (hook) {
                await hook(hookOption);
            }
        }
    }

    private handleError(error: unknown, operation: string): never {
        const errorMessage =
            error instanceof Error ? error.message : String(error);
        throw new Error(`${operation}: ${errorMessage}`);
    }

    /**
     * Main method to execute the deployment task
     * @param web - Environment context object containing build output path and other info
     */
    async execute(web: EnvironmentContext) {
        try {
            // Establish SSH connection
            await this.connect();
            // Process file and directory configurations for upload
            await this.processIncludes(web);

            // Execute pre-upload hooks
            // Including both global and server-level hooks
            await this.execHooks([
                this.pluginOption.onBeforeUpload,
                this.serverConfig.onBeforeUpload,
            ]);
            // Execute pre-upload commands
            await this.execCommands(this.serverConfig.preCommands);

            // Upload individual files
            await this.uploadFiles();
            // Upload directories
            await this.uploadDirectories(web);

            // Execute post-upload commands
            await this.execCommands(this.serverConfig.postCommands);
            // Execute post-upload hooks
            // Including both global and server-level hooks
            await this.execHooks([
                this.pluginOption.onAfterUpload,
                this.serverConfig.onAfterUpload,
            ]);
        } catch (error: unknown) {
            this.handleError(error, 'Deploy failed');
        } finally {
            // Always dispose SSH connection regardless of success or failure
            this.ssh.dispose();
        }
    }
}
