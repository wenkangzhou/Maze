# 儿童迷宫

一个面向儿童的移动端优先迷宫 Web App。孩子可以在触屏设备上直接划线走迷宫，使用局部提示或完整答案，并在浏览器本地保存闯关进度。

## 功能

- 5 个难度等级，共 100 张可复现迷宫
- 鼠标与触屏划线，带路径碰撞和高容错交互
- 局部提示、完整答案、计时与星级评价
- 逐关解锁、成就与进度统计
- 家长设置和调试用迷宫 Playground
- 纯前端静态导出，不依赖数据库或服务端运行时

## 技术栈

- Next.js 16（App Router）
- React 19
- TypeScript
- Tailwind CSS 4
- Vitest

## 本地开发

需要 Node.js 22 和 npm。

```bash
npm ci
npm run dev
```

开发服务器默认运行在 [http://localhost:43117](http://localhost:43117)。

## 常用命令

```bash
npm run dev        # 启动本地开发服务器（端口 43117）
npm test           # 运行全部单元测试
npm run test:watch # 监听模式运行测试
npm run typecheck  # 运行 TypeScript 类型检查
npm run build      # 生成静态站点到 out/
```

项目启用了 `output: "export"`，因此生产构建是纯静态文件；生产环境由 Vercel 托管生成的静态资源。

生产构建暂时显式使用 Webpack；这是 Next.js 16 官方支持的构建选项，可避开当前 Turbopack 在本项目静态导出阶段的页面模块查找问题。

## 页面

| 路径 | 说明 |
| --- | --- |
| `/` | 关卡首页 |
| `/level/1` 至 `/level/5` | 各难度的迷宫列表 |
| `/maze/L1-01` 等 | 单张迷宫游戏页 |
| `/progress` | 闯关进度与成就 |
| `/settings` | 家长设置 |
| `/dev/maze` | 迷宫参数调试页 |

## 数据与隐私

游戏进度和设置只保存在当前浏览器的 `localStorage` 中，不会上传到服务器。清理浏览器站点数据会同时清除游戏进度。

## 部署到 Vercel

该项目可以直接通过 Vercel 的 Git 集成部署：

1. 将仓库导入 Vercel。
2. Framework Preset 选择 **Next.js**（通常会自动识别）。
3. Install Command 使用 `npm ci`。
4. Build Command 使用 `npm run build`。
5. Output Directory 留空，让 Vercel 按 Next.js 配置自动处理。
6. 当前版本不需要配置环境变量。

推送到非生产分支会生成 Preview Deployment；合并或推送到生产分支后会生成 Production Deployment。本地的 `43117` 端口只影响开发服务器，不影响 Vercel 的线上端口分配。

## 项目结构

```text
src/app/              Next.js 页面与全局样式
src/components/       迷宫画板和界面组件
src/data/             关卡配置
src/lib/maze/         生成、寻路、碰撞与验证算法
src/lib/storage/      本地进度与设置
tests/                Vitest 单元测试
```

## GitHub 仓库

[github.com/wenkangzhou/Maze](https://github.com/wenkangzhou/Maze)
