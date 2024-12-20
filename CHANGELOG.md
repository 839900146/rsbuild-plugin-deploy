# Changelog

所有重大变更都会记录在此文件中。
All notable changes to this project will be documented in this file.

## [1.0.1] - 2024-12-20

### Changed

-   改进了文件忽略机制的实现
-   Improved the implementation of file ignore mechanism
-   优化了部署任务的执行流程
-   Optimized the execution process of deployment tasks
-   调整了 bun 版本要求至 1.1.40+
-   Adjusted the bun version requirement to 1.1.40+

### Added

-   📝 新增了更详细的部署日志输出
-   Added more detailed deployment log output
-   ✅ 补充了单元测试用例
-   Added unit test cases
-   🚫 支持忽略自定义文件
-   Supported custom file ignore
-   📚 新增英文版 README.en.md
-   Added English version README.en.md

## [1.0.0] - 2024-12-04

### Features

-   🚀 支持多服务器并行部署
-   Supported multi-server parallel deployment
-   🔒 支持密码和密钥两种认证方式
-   Supported password and key authentication
-   🎯 灵活的文件上传配置
-   Flexible file upload configuration
-   ⚡️ 部署前后命令执行
-   Command execution before and after deployment
-   🎨 自定义部署钩子函数
-   Custom deployment hook functions
-   📦 智能的产物上传策略
-   Intelligent product upload strategy
-   🔄 支持自定义文件过滤
-   Supported custom file filtering
-   ⚙️ 完整的类型定义支持
-   Complete type definition support

### Added

-   实现基础的 SSH 连接功能
-   Implemented basic SSH connection functionality
-   支持文件和目录的上传
-   Supported file and directory uploads
-   支持自定义上传前后钩子函数
-   Supported custom upload hook functions
-   支持自定义命令执行
-   Supported custom command execution
-   支持文件过滤配置
-   Supported file filtering configuration
-   添加了详细的使用文档
-   Added detailed usage documentation
-   集成了单元测试框架
-   Integrated unit test framework
-   添加了 TypeScript 类型定义
-   Added TypeScript type definitions

### Technical

-   使用 TypeScript 开发
-   Developed using TypeScript
-   基于 node-ssh 实现 SSH 连接
-   Implemented SSH connection based on node-ssh
-   支持 ESM 和 CommonJS 两种模块规范
-   Supported ESM and CommonJS module formats
-   集成了 Biome 代码格式化工具
-   Integrated Biome code formatting tool
-   使用 Bun 作为包管理器和测试运行器
-   Used Bun as the package manager and test runner
