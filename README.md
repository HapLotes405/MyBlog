# HapLotes405's Wiki

个人博客系统，支持 Markdown 写作、评论互动、标签分类。前后端分离架构。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 + TypeScript + CSS Modules |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL |
| 认证 | JWT（bcrypt 密码哈希） |

## 环境要求

- **Node.js** ≥ 18
- **PostgreSQL** ≥ 14（需创建数据库，默认名称 `wiki`）

## 快速开始

```bash
# 1. 克隆项目
git clone <repo-url>
cd <project-directory>

# 2. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 3. 配置环境变量
cd ../backend
cp .env.example .env
```

编辑 `backend/.env`，填入你自己的配置：

```ini
PORT=8000
JWT_SECRET=你的JWT密钥（随机字符串）
DATABASE_URL=postgresql://用户名:密码@localhost:5432/wiki
UPLOAD_DIR=./uploads
BLOGGER_EMAIL=你的博主登录邮箱
BLOGGER_PASSWORD=你的博主登录密码
```

```bash
# 4. 初始化数据库（建表 + 创建博主账号）
npm run db:init
npm run db:seed

# 5. 启动后端（端口 8000）
npm run dev
```

另开一个终端：

```bash
# 6. 启动前端（端口 3000）
cd frontend
npx next dev
```

打开 `http://localhost:3000`，用你在 `.env` 中设置的**博主邮箱和密码**登录。

## 项目结构

```
├── backend/
│   ├── src/
│   │   ├── config/        # 环境变量配置
│   │   ├── db/            # 数据库连接、迁移、种子
│   │   ├── middleware/     # JWT 认证中间件
│   │   ├── routes/        # API 路由（auth, blog, comment, upload...）
│   │   ├── types/         # 类型定义
│   │   └── utils/         # 工具函数
│   ├── uploads/           # 上传文件目录
│   └── .env.example       # 环境变量模板
│
├── frontend/
│   ├── src/
│   │   ├── app/           # Next.js App Router 页面
│   │   ├── components/    # UI 组件
│   │   ├── context/       # React Context（Auth）
│   │   ├── services/      # API 调用封装
│   │   ├── types/         # 类型定义
│   │   └── utils/         # 工具函数
│   └── public/            # 静态资源
```

## 功能

- **博客写作**：Markdown 编辑器，支持图片/视频上传，实时预览
- **文章管理**：发布、编辑、删除，标签分类，全文搜索
- **评论系统**：登录用户可评论和回复
- **点赞收藏**：用户互动
- **博主鉴权**：JWT + role-based，博主独有写作和管理权限

## 常见问题

**Q: 登录提示「邮箱或密码错误」？**
确认已运行 `npm run db:seed`，且 `.env` 中的邮箱密码与注册登录时一致。

**Q: 启动后端报 `Missing required environment variable`？**
检查 `backend/.env` 是否已创建并填写了所有必填项。

**Q: PostgreSQL 连接失败？**
确认 PostgreSQL 服务已启动，`wiki` 数据库已创建，`DATABASE_URL` 中的用户名和密码正确。
