# pluginDeploy Readme

`pluginDeploy` 是一个功能强大的部署插件，旨在通过 SSH 连接将文件自动化地部署到远程服务器上。该插件与 Webpack 或 rsbuild 构建系统高度集成，使得部署流程更加流畅和可控。

## 安装

首先，请确保你的项目中已经安装了 `@rsbuild/core` 和 `node-ssh` 这两个依赖包。随后，你可以通过 npm 或 yarn 安装 `pluginDeploy` 插件（假设它已发布）：

```bash
# 使用npm
npm install @your-package/pluginDeploy -D
# 使用yarn
yarn add @your-package/pluginDeploy -D
# 使用pnpm
pnpm add @your-package/pluginDeploy -D
# 使用bun
bun add @your-package/pluginDeploy -D
```

## 使用指南

### 配置参数详解

`pluginDeploy` 插件提供了一系列灵活的配置参数，以满足不同的部署场景需求。

#### 服务器配置（`servers`）

-   **类型**：`ServerOption` 或 `ServerOption[]`
-   **描述**：定义了一个或多个服务器的连接和部署配置。

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
-   **描述**：用于动态指定要上传的文件或目录集合。可以是字符串、`FileStruct` 对象或返回 `FileStruct` 的函数。**若不指定，默认上传 dist 产物，若指定了 include，则不再自动上传 dist 产物**。
    -   `FileStruct`：
        -   `local`（字符串）：本地文件或目录的路径。
        -   `remote`（字符串）：远程文件或目录的路径。

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
import pluginDeploy from '@your-package/pluginDeploy';

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

### 二次开发

#### 开发环境

-   包管理器：`bun:1.1.38`，建议不低于`1.1.30`
