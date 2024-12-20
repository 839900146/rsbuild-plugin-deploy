import type { EnvironmentContext } from '@rsbuild/core';
import type { NodeSSH } from 'node-ssh';

export type SSHOption = {
    host: string;
    port: number;
    username: string;
    password?: string;
    privateKey?: string;
};

export interface FileStruct {
    local: string;
    remote: string;
}

export type IncludeStruct = (
    | string
    | FileStruct
    | ((data: EnvironmentContext) => FileStruct)
)[];

export type HookOption = {
    ssh: NodeSSH;
    files: FileStruct[];
    dirs: FileStruct[];
    serverConfig: ServerOption;
    pluginOption: PluginDeployOptions;
};

export interface Hook {
    // 上传前的钩子
    onBeforeUpload?: (option: HookOption) => void | Promise<void>;
    // 上传后的钩子
    onAfterUpload?: (option: Readonly<HookOption>) => void | Promise<void>;
}

export interface ServerOption extends Hook {
    // ssh的连接配置
    sshConfig: SSHOption;
    // 远程目录
    remote?: string;
    // 在上传前执行的命令
    preCommands?: string[];
    // 在上传后执行的命令
    postCommands?: string[];
    // 修改上传的文件集合
    include?: IncludeStruct;
}

export type PluginDeployOptions = {
    servers: ServerOption | ServerOption[];
    // 公共配置远程目录
    baseRemote?: string;
    // 忽略上传的文件
    ignore?: (string | RegExp | ((filePath: string) => boolean))[];
} & Hook;
