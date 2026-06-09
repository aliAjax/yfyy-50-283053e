# 诉求办理工作台

基于 Vite、React、TypeScript 和 Ant Design 的诉求办理工作台。项目内置一套本地开发和 CI 共用的质量门禁，覆盖类型检查、ESLint、单元测试、生产构建和构建产物验证。

## 环境要求

- Node.js 20.x
- npm 10.x 或随 Node.js 20 安装的 npm

## 快速开始

```bash
npm install
npm run verify
npm run dev
```

新机器拉下项目后，先执行 `npm install` 安装依赖，再用 `npm run verify` 完整校验，最后通过 `npm run dev` 启动本地开发服务。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动本地开发服务 |
| `npm run typecheck` | 执行 TypeScript 严格类型检查 |
| `npm run lint` | 执行 ESLint 代码检查 |
| `npm run lint:fix` | 自动修复可修复的 ESLint 问题 |
| `npm run test` | 运行 Vitest 单元测试 |
| `npm run test:watch` | 以监听模式运行 Vitest |
| `npm run test:coverage` | 生成单元测试覆盖率报告 |
| `npm run build` | 类型检查通过后执行生产构建 |
| `npm run build:only` | 仅执行 Vite 构建 |
| `npm run verify:build` | 校验 `dist/` 构建产物完整性 |
| `npm run verify` | 串联执行完整质量门禁 |
| `npm run preview` | 预览生产构建产物 |

## 质量门禁

`npm run verify` 是本地和 CI 复用的主入口，执行顺序如下：

1. `npm run typecheck`：使用严格 TypeScript 配置检查类型和 switch 分支。
2. `npm run lint`：检查 ESLint 规则，历史 `any` 类型和未使用项以 warning 呈现，错误会阻断流程。
3. `npm run test`：运行 Vitest 单元测试。
4. `npm run build`：执行类型检查和 Vite 生产构建。
5. `npm run verify:build`：检查 `dist/index.html`、`dist/assets/`、JS/CSS产物、资源引用和 React 挂载点。

构建产物验证脚本会在缺少关键产物或资源引用失效时以非零退出码失败；单个 JS 文件超过 500KB 时会输出拆包提示，但不会阻断发布。

## CI

GitHub Actions 工作流位于 `.github/workflows/ci.yml`，在推送或 Pull Request 指向 `main`、`master`、`develop` 时触发。CI 使用 Node.js 20，执行 `npm ci` 后依次运行类型检查、ESLint、单元测试、构建和构建产物验证，并在成功后上传 `dist/` 产物，保留 7 天。

## 项目结构

```text
src/
  components/      通用组件
  data/            字典、流程配置和模拟数据
  hooks/           React hooks
  lib/             工具函数和单元测试
  pages/           业务页面
  store/           Zustand 状态
  types/           领域类型定义
scripts/
  verify-build.mjs 构建产物验证脚本
.github/workflows/
  ci.yml           GitHub Actions 质量门禁
```
