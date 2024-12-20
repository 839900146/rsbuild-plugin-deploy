import type { RsbuildPlugin } from '@rsbuild/core';
import chalk from 'chalk';
import { DeployTask } from './deploy-task';
import type { PluginDeployOptions } from './types';

const PLUGIN_NAME = 'scope:deploy';

export const pluginDeploy = (options: PluginDeployOptions): RsbuildPlugin => ({
    name: PLUGIN_NAME,

    setup(api) {
        api.onAfterBuild(async ({ environments }) => {
            const startTime = Date.now();
            const servers = Array.isArray(options.servers)
                ? options.servers
                : [options.servers];

            try {
                for (const server of servers) {
                    const task = new DeployTask(server, options);
                    await task.execute(environments.web);
                }

                console.log(
                    chalk.green(
                        `[${PLUGIN_NAME}] Deploy successful! Time taken: ${Date.now() - startTime}ms`,
                    ),
                );
            } catch (error: unknown) {
                console.error(
                    chalk.red(
                        `[${PLUGIN_NAME}] Deploy failed: ${error instanceof Error ? error.message : String(error)}`,
                    ),
                );
                throw error;
            }
        });
    },
});
