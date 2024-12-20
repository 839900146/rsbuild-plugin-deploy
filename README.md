# rsbuild-plugin-deploy

[English](./README.en.md) | 简体中文

`rsbuild-plugin-deploy` 是一个功能强大的部署插件，用于通过 SSH 将构建产物自动化部署到远程服务器。该插件与 `rsbuild` 构建系统无缝集成。

## 安装

你可以通过包管理器安装 `rsbuild-plugin-deploy` 插件：

```bash
# 使用npm
npm install rsbuild-plugin-deploy -D
# 使用yarn
yarn add rsbuild-plugin-deploy -D
# 使用pnpm
pnpm add rsbuild-plugin-deploy -D
# 使用bun
bun add rsbuild-plugin-deploy -D
```

## 特性

-   🚀 支持多服务器并行部署
-   🔒 支持密码和密钥两种认证方式
-   🎯 灵活的文件上传配置
-   ⚡️ 部署前后命令执行
-   🎨 自定义部署钩子函数
-   📦 智能的产物上传策略
-   🔄 支持自定义文件过滤
-   ⚙️ 完整的类型定义支持

## 工作流程

1. 构建完成后自动触发部署
2. 执行全局 `onBeforeUpload` 钩子
3. 对每个服务器并行执行:
    - 建立 SSH 连接
    - 执行服务器级 `onBeforeUpload` 钩子
    - 执行 `preCommands` 命令
    - 处理上传文件列表
    - 上传文件和目录(支持过滤 node_modules 和隐藏文件)
    - 执行 `postCommands` 命令
    - 执行服务器级 `onAfterUpload` 钩子
4. 执行全局 `onAfterUpload` 钩子
5. 输出部署结果和耗时统计

## 使用指南

### 配置参数详解

`rsbuild-plugin-deploy` 插件提供了一系列灵活的配置参数，以满足不同的部署场景需求。

#### 服务器配置（`servers`）

-   **类型**：`ServerOption | ServerOption[]`
-   **描述**：定义单个或多个服务器的部署配置，支持并行部署

##### `sshConfig`

-   **类型**：`SSHOption`
-   **描述**：包含了连接远程服务器所需的 SSH 信息。
    -   `host`（字符串）：远程服务器的地址。
    -   `port`（数字）：SSH 端口，默认为 22。
    -   `username`（字符串）：SSH 用户名。
    -   `password`（字符串，可选）：SSH 密码。
    -   `privateKey`（字符串，可选）：用于身份验证的私钥路径或内容。

##### `remote (可选)`

-   **类型**：`string`
-   **描述**：远程服务器上的根目录路径，用于确定文件上传的位置。

##### `preCommands (可选)`

-   **类型**：`string[]`
-   **描述**：在文件上传之前，要在远程服务器上执行的命令数组，例如清理旧目录或资源。

##### `postCommands (可选)`

-   **类型**：`string[]`
-   **描述**：在文件上传之后，要在远程服务器上执行的命令数组。

##### `include (可选)`

-   **类型**：`IncludeStruct`
-   **描述**：指定要上传的文件或目录集合。支持以下几种方式：

    -   字符串路径：直接指定本地文件或目录
    -   FileStruct 对象：指定本地和远程的映射关系
    -   函数：根据构建上下文动态生成映射关系

    **注意**:

    -   默认情况下会上传 dist 产物目录
    -   指定 include 后将仅上传指定的文件/目录
    -   上传时会自动过滤 node_modules 和以 . 开头的隐藏文件

### 钩子函数（`Hook`）

插件支持在上传前后执行自定义的钩子函数，这些钩子函数会接收一个 `option` 参数，该参数包含了与当前部署任务相关的信息。
钩子函数可写在 `option` 这一级，也可以写在 `servers` 这一级，还可以同时写在多个位置，具体取决于你希望在哪个阶段执行钩子函数。需要注意的是：`option` 这一级的钩子函数会优先执行。

-   `onBeforeUpload`

    -   **类型**：`(option: HookOption) => void | Promise<void>`
    -   **描述**：在文件上传之前执行的钩子函数。
    -   **参数**：
        -   `option`（`HookOption` 类型）：包含部署任务的信息。

-   `onAfterUpload`
    -   **类型**：`(option: Readonly<HookOption>) => void | Promise<void>`
    -   **描述**：在文件上传之后执行的钩子函数。
    -   **参数**：
        -   `option`（`Readonly<HookOption>` 类型）：包含部署任务的信息，且为只读。

#### `HookOption` 类型定义

HookOption 类型是一个对象，它包含了以下属性：

-   `ssh`：`NodeSSH` 类型的实例，表示与远程服务器的 SSH 连接。
-   `files`：`FileStruct[]` 类型的数组，包含了要上传的文件信息。
-   `dirs`：`FileStruct[]` 类型的数组，包含了要上传的目录信息（如果插件支持目录上传的话）。
-   `serverConfig`：`ServerOption` 类型，表示当前正在部署的服务器配置。
-   `pluginOption`：`PluginDeployOptions` 类型，表示插件的整体配置选项。

示例 `HookOption` 类型定义：

```typescript
interface HookOption {
	ssh: NodeSSH;
	files: FileStruct[];
	dirs: FileStruct[];
	serverConfig: ServerOption;
	pluginOption: PluginDeployOptions;
}
```

在钩子函数中，你可以根据 `option` 参数的信息来执行相应的逻辑，例如记录日志、发送通知、执行额外的命令等。

#### 公共配置远程目录（`baseRemote`）

-   **类型**：`string`（可选）
-   **描述**：为所有服务器配置提供一个公共的远程根目录。若 servers 内的 remote 配置项为空，则使用该配置项作为远程根目录。

### 示例配置

以下是一个将 `pluginDeploy` 插件集成到 rsbuild 配置中的示例：

```javascript
import { pluginDeploy } from 'rsbuild-plugin-deploy';

export default defineConfig({
	plugins: [
		pluginDeploy({
			servers: [
				{
					sshConfig: {
						username: process.env.SSH_USERNAME || 'defaultUser',
						password: process.env.SSH_PASSWORD,
						host: process.env.SSH_HOST || 'defaultHost',
						port: Number(process.env.SSH_PORT) || 22,
						privateKey: process.env.SSH_PRIVATE_KEY,
					},
					// 可选，若remote为空，则使用baseRemote作为远程根目录
					remote: '/remote/path/to/deploy',
					// 可选，在上传前执行的命令数组
					preCommands: ['echo "Starting deployment..."'],
					// 可选，在上传后执行的命令数组
					postCommands: ['echo "Deployment complete!"'],
					// 可选，用于动态指定要上传的文件或目录集合，若不指定，默认上传dist产物
					// 若指定了include，则不再自动上传dist产物
					include: [
						// 直接传递目录
						'./dist',
						// 直接传递文件
						'./xxx.json',
						// 指定本地目录和远程目录
						{ local: './dist', remote: '/opt/webapp' },
						// 指定本地文件和远程文件
						{ local: './xxx.json', remote: '/opt/webapp/xxx.json' },
						// 动态指定本地文件和远程文件
						(context) => ({
							local: 'xxx.json',
							remote: '/' + context.name + '.json',
						}),
					],
				},
				// 可以添加更多服务器配置
			],
			baseRemote: '/common/remote/path', // 可选，提供公共远程根目录
			onBeforeUpload: async (option) => {
				console.log('Before upload hook executed');
				// 执行自定义逻辑
			},
			onAfterUpload: async (option) => {
				console.log('After upload hook executed');
				// 执行自定义逻辑
			},
		}),
	],
	// ... 其他配置
});
```

### 注意事项

-   确保提供的 SSH 连接信息准确无误，并且你有权访问远程服务器。
-   如果使用私钥进行身份验证，请确保私钥文件的权限设置正确。
-   钩子函数中的异步操作应使用 `async/await` 或返回 `Promise`，以确保它们按顺序执行。

## 二次开发与维护

### 开发环境

-   包管理器：`bun:1.1.40`，建议不低于`1.1.40`
