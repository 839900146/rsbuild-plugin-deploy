# rsbuild-plugin-deploy

English | [简体中文](./README.md)

`rsbuild-plugin-deploy` is a powerful deployment plugin for automatically deploying build artifacts to remote servers via SSH. This plugin seamlessly integrates with the `rsbuild` build system.

## Installation

You can install the `rsbuild-plugin-deploy` plugin using your preferred package manager:

```bash
# Using npm
npm install rsbuild-plugin-deploy -D
# Using yarn
yarn add rsbuild-plugin-deploy -D
# Using pnpm
pnpm add rsbuild-plugin-deploy -D
# Using bun
bun add rsbuild-plugin-deploy -D
```

## Features

-   🚀 Support for parallel deployment to multiple servers
-   🔒 Support for both password and key-based authentication
-   🎯 Flexible file upload configuration
-   ⚡️ Pre and post-deployment command execution
-   🎨 Custom deployment hook functions
-   📦 Smart artifact upload strategy
-   🔄 Support for custom file filtering
-   ⚙️ Complete TypeScript type definitions

## Workflow

1. Automatically triggers deployment after build completion
2. Executes global `onBeforeUpload` hook
3. Parallel execution for each server:
    - Establishes SSH connection
    - Executes server-level `onBeforeUpload` hook
    - Executes `preCommands`
    - Processes upload file list
    - Uploads files and directories (with node_modules and hidden files filtering)
    - Executes `postCommands`
    - Executes server-level `onAfterUpload` hook
4. Executes global `onAfterUpload` hook
5. Outputs deployment results and time statistics

## Usage Guide

### Configuration Parameters

The `rsbuild-plugin-deploy` plugin provides a series of flexible configuration parameters to meet different deployment scenarios.

#### Server Configuration (`servers`)

-   **Type**: `ServerOption | ServerOption[]`
-   **Description**: Defines deployment configuration for single or multiple servers, supporting parallel deployment

##### `sshConfig`

-   **Type**: `SSHOption`
-   **Description**: Contains SSH information required for connecting to remote servers.
    -   `host` (string): Remote server address
    -   `port` (number): SSH port, defaults to 22
    -   `username` (string): SSH username
    -   `password` (string, optional): SSH password
    -   `privateKey` (string, optional): Path or content of private key for authentication

##### `remote (optional)`

-   **Type**: `string`
-   **Description**: Root directory path on the remote server for file uploads

##### `preCommands (optional)`

-   **Type**: `string[]`
-   **Description**: Array of commands to execute on the remote server before file upload

##### `postCommands (optional)`

-   **Type**: `string[]`
-   **Description**: Array of commands to execute on the remote server after file upload

##### `include (optional)`

-   **Type**: `IncludeStruct`
-   **Description**: Specifies files or directories to upload. Supports:

    -   String paths: Direct specification of local files or directories
    -   FileStruct objects: Specify local and remote mapping relationships
    -   Functions: Dynamically generate mapping relationships based on build context

    **Note**:

    -   By default, uploads the dist artifact directory
    -   When include is specified, only uploads specified files/directories
    -   Automatically filters node_modules and hidden files starting with .

### Hook Functions

The plugin supports custom hook functions before and after upload. These hooks receive an `option` parameter containing information about the current deployment task.
Hooks can be written at the `option` level, `servers` level, or both, depending on when you want them to execute. Note that hooks at the `option` level execute first.

-   `onBeforeUpload`

    -   **Type**: `(option: HookOption) => void | Promise<void>`
    -   **Description**: Hook function executed before file upload
    -   **Parameters**:
        -   `option` (`HookOption` type): Contains deployment task information

-   `onAfterUpload`
    -   **Type**: `(option: Readonly<HookOption>) => void | Promise<void>`
    -   **Description**: Hook function executed after file upload
    -   **Parameters**:
        -   `option` (`Readonly<HookOption>` type): Contains deployment task information (readonly)

#### `HookOption` Type Definition

The HookOption type is an object with the following properties:

```typescript
interface HookOption {
	ssh: NodeSSH;
	files: FileStruct[];
	dirs: FileStruct[];
	serverConfig: ServerOption;
	pluginOption: PluginDeployOptions;
}
```

#### Common Remote Directory Configuration (`baseRemote`)

-   **Type**: `string` (optional)
-   **Description**: Provides a common remote root directory for all server configurations

### Ignore Files Configuration (`ignore`)

-   **Type**: `(string | RegExp | ((filePath: string) => boolean))[]`
-   **Default**: `[]`

Ignore file configuration, supports the following matching methods:

1. String: Use `includes` matching, e.g. `'.git'` will ignore all files containing `.git` in the path
2. Regular expression: Use `test` matching, e.g. `/\.DS_Store$/` will ignore all files ending with `.DS_Store`
3. Function: Custom matching logic, parameter is file path, return `true` to ignore the file
4. Priority: The `ignore` configuration item has higher priority than the `include` configuration item, that is, the `ignore` configuration item will override the file in the `include` configuration item

### Example Configuration

Here's an example of integrating the `pluginDeploy` plugin into rsbuild configuration:

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
					remote: '/remote/path/to/deploy',
					preCommands: ['echo "Starting deployment..."'],
					postCommands: ['echo "Deployment complete!"'],
					include: [
						'./dist',
						'./xxx.json',
						{ local: './dist', remote: '/opt/webapp' },
						{ local: './xxx.json', remote: '/opt/webapp/xxx.json' },
						(context) => ({
							local: 'xxx.json',
							remote: '/' + context.name + '.json',
						}),
					],
				},
			],
			baseRemote: '/common/remote/path',
			ignore: [
				// Ignore .git directory
				'.git',
				// Ignore .DS_Store file
				/\.DS_Store$/,
				// Ignore all files ending with .test.ts
				/\.test\.ts$/,
				// Ignore all .log files
				(filePath) => filePath.endsWith('.log'),
			],
			onBeforeUpload: async (option) => {
				console.log('Before upload hook executed');
			},
			onAfterUpload: async (option) => {
				console.log('After upload hook executed');
			},
		}),
	],
});
```

### Important Notes

-   Ensure provided SSH connection information is accurate and you have permission to access the remote server
-   If using private key authentication, ensure proper file permissions for the private key
-   Asynchronous operations in hook functions should use `async/await` or return `Promise` to ensure sequential execution

## Development and Maintenance

### Development Environment

-   Package Manager: `bun:1.1.40`, recommended version no lower than `1.1.40`
