# MyBlog

个人博客系统，前后端分离架构。支持 Markdown 写作、AI 辅助、评论互动、标签分类、文件上传、小游戏排行榜等功能。

## 目录

- [技术栈](#技术栈)
- [功能](#功能)
- [项目结构](#项目结构)
- [数据库设计](#数据库设计)
- [API 接口](#api-接口)
- [本地开发](#本地开发)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [CI/CD](#cicd)
- [环境变量](#环境变量)
- [常见问题](#常见问题)

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 + React 19 + TypeScript + CSS Modules |
| Markdown | markdown-it + highlight.js |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL 16 |
| 认证 | JWT + bcrypt（7 天过期） |
| AI | DeepSeek API（编辑器内置 AI 助手） |
| 文件上传 | multer（支持图片/视频/文档，最大 100MB） |
| 部署 | Docker Compose + Nginx + Cloudflare Tunnel |
| CI/CD | GitHub Actions（自动构建镜像 → 推送 GHCR → SSH 部署到 ECS） |

**环境要求：**

- Node.js ≥ 18
- PostgreSQL ≥ 14
- Docker & Docker Compose（容器化部署时）

---

## 功能

### 博客写作

- **Markdown 编辑器**：实时预览，支持图片/视频/文件上传，粘贴即上传
- **AI 写作助手**：基于 DeepSeek API，可在编辑器中与 AI 对话辅助写作
- **文章管理**：发布、编辑、删除、Markdown 导出
- **自动生成**：slug（URL 别名）、阅读时间
- **标签分类**：每篇文章支持多标签，可按标签筛选
- **全文搜索**：前端实时搜索文章标题和内容
- **阅读量统计**：自动计数，API 支持 `?count=false` 跳过

### 用户系统

- **注册 / 登录**：用户名 + 邮箱 + 密码注册，支持用户名或邮箱登录
- **JWT 鉴权**：token 有效期 7 天，localStorage 存储
- **角色区分**：blogger（博主）和 user（普通用户）
  - 博主：写作、编辑、删除文章，管理文件，编辑个人信息页，使用 AI 助手
  - 用户：浏览、评论、点赞、收藏
- **修改密码**：登录后可修改密码

### 评论系统

- 支持文章评论和楼中楼回复（二级嵌套）
- 登录用户可发表和删除自己的评论
- 博主可删除任意评论

### 互动功能

- **点赞**：toggle 式，再次点击取消
- **收藏**：toggle 式，可在个人中心查看收藏列表
- 点赞数和收藏数实时更新

### 个人主页

博主可编辑一个公开的个人信息页，包含：

- 基本信息：姓名、昵称、头像、封面图、头衔、个人简介、位置、邮箱
- 社交链接：多个平台链接（JSON 配置）
- 技能列表
- 时间线：教育经历、工作经历、里程碑
- 兴趣爱好
- 照片墙

### 文件管理

- 上传文件自动分类存储：图片（`/uploads/images/`）、视频（`/uploads/videos/`）、文档（`/uploads/files/`）
- 文档文件自动记录元数据到数据库，支持下载计数
- 支持从 URL 下载远程图片到本地
- 博主可查看文件列表、删除文件
- 删除文章时自动清理关联文件

### 小游戏（Janus Labyrinth）

- 8 关迷宫游戏，记录通关时间
- 全球排行榜，按关卡排名（最佳成绩）
- 登录后提交成绩，同关卡只保留最优时间
- 前端游戏页面使用 Canvas 渲染

---

## 项目结构

```
├── backend/
│   ├── src/
│   │   ├── config/           # 环境变量加载与校验
│   │   ├── db/               # 数据库连接池 (pg)、自动迁移、种子数据
│   │   ├── middleware/        # JWT 认证中间件、错误处理
│   │   ├── routes/
│   │   │   ├── auth.ts       # 注册 / 登录 / 获取当前用户 / 修改密码
│   │   │   ├── blog.ts       # 文章 CRUD + 标签列表
│   │   │   ├── comment.ts    # 评论列表 / 发表 / 删除
│   │   │   ├── interaction.ts # 点赞 / 收藏 toggle + 用户列表
│   │   │   ├── profile.ts    # 博主个人信息页
│   │   │   ├── user.ts       # 用户个人资料
│   │   │   ├── upload.ts     # 文件上传 + 远程图片下载
│   │   │   ├── files.ts      # 文件管理（列表/下载/删除）
│   │   │   ├── game-scores.ts # 游戏排行榜
│   │   │   └── ai.ts         # DeepSeek AI 聊天接口
│   │   ├── types/            # 共享类型定义 + 数据库行类型
│   │   ├── utils/            # 工具函数（日期格式化、行转对象）
│   │   └── index.ts          # Express 服务入口
│   ├── uploads/              # 上传文件存储目录
│   │   ├── images/
│   │   ├── videos/
│   │   └── files/
│   ├── Dockerfile            # 多阶段构建 (node:20-alpine)
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/              # Next.js App Router 页面
│   │   │   ├── page.tsx              # 首页
│   │   │   ├── layout.tsx            # 根布局
│   │   │   ├── globals.css           # 全局样式
│   │   │   ├── login/                # 登录页
│   │   │   ├── register/             # 注册页
│   │   │   ├── blog/
│   │   │   │   ├── page.tsx          # 博客列表
│   │   │   │   ├── BlogContent.tsx   # 列表内容组件
│   │   │   │   ├── new/              # 新建文章
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx      # 文章详情
│   │   │   │       └── edit/         # 编辑文章
│   │   │   ├── profile/              # 个人主页
│   │   │   └── games/
│   │   │       ├── page.tsx          # 游戏入口
│   │   │       └── janus-labyrinth/  # 迷宫游戏
│   │   ├── components/
│   │   │   ├── blog/
│   │   │   │   ├── BlogCard.tsx          # 文章卡片
│   │   │   │   ├── CommentSection.tsx    # 评论区
│   │   │   │   ├── SearchBar.tsx         # 搜索栏
│   │   │   │   ├── FilePreviewEnhancer.tsx # 文件预览
│   │   │   │   └── editor/
│   │   │   │       ├── BlogEditor.tsx    # Markdown 编辑器
│   │   │   │       └── AIAssistant.tsx   # AI 助手面板
│   │   │   ├── common/
│   │   │   │   └── SafeHTML.tsx          # 安全的 HTML 渲染
│   │   │   ├── home/
│   │   │   │   ├── HeroSection.tsx       # 首页 Hero
│   │   │   │   ├── Timeline.tsx          # 时间线
│   │   │   │   └── InterestsSection.tsx  # 兴趣爱好
│   │   │   └── layout/
│   │   │       ├── Header.tsx            # 导航栏
│   │   │       └── Footer.tsx            # 页脚
│   │   ├── context/
│   │   │   ├── AuthContext.tsx           # 认证状态管理
│   │   │   └── Providers.tsx             # Context Provider 组合
│   │   ├── services/
│   │   │   └── api.ts                    # 全部 API 调用封装
│   │   ├── types/
│   │   │   └── index.ts                  # 前端类型定义
│   │   ├── utils/
│   │   │   └── markdown.ts              # Markdown 渲染
│   │   └── data/
│   │       └── mock.ts                  # 开发 Mock 数据
│   ├── public/                           # 静态资源
│   ├── Dockerfile                        # Next.js standalone 构建
│   ├── package.json
│   └── tsconfig.json
│
├── nginx/
│   ├── nginx.conf                        # Nginx 主配置（Gzip、安全头、限速）
│   ├── conf.d/
│   │   ├── default.conf                  # 站点配置（反向代理到前后端）
│   │   └── ssl.conf.example             # HTTPS 配置示例
│   └── ssl/
│       ├── generate-certs.sh             # 自签名证书生成脚本
│       └── .gitignore
│
├── cloudflared/                          # Cloudflare Tunnel 配置（生产环境）
├── backup/                               # 数据库备份目录
├── scripts/                              # 辅助脚本
├── docker-compose.yml                    # 开发环境编排
├── docker-compose.prod.yml               # 生产环境编排（GHCR 镜像 + Tunnel）
└── .github/workflows/ci.yml              # CI/CD 流水线
```

---

## 数据库设计

系统使用 PostgreSQL，启动时通过 `db:migrate` 自动建表（`IF NOT EXISTS`，幂等安全）。共 7 张表：

### users（用户表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | SERIAL PK | 用户 ID |
| username | TEXT UNIQUE | 用户名 |
| email | TEXT UNIQUE | 邮箱（可为空） |
| password_hash | TEXT | bcrypt 哈希密码 |
| nickname | TEXT | 昵称 |
| avatar | TEXT | 头像 URL |
| bio | TEXT | 个人简介 |
| role | TEXT | `blogger` 或 `user` |
| created_at | TIMESTAMPTZ | 注册时间 |

### blogs（文章表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | SERIAL PK | 文章 ID |
| slug | TEXT UNIQUE | URL 别名 |
| title | TEXT | 标题 |
| summary | TEXT | 摘要 |
| content | TEXT | Markdown 正文 |
| cover_image | TEXT | 封面图 URL |
| tags | JSONB | 标签数组 |
| author_id | INTEGER FK → users | 作者 |
| reading_time | INTEGER | 预估阅读时间（分钟） |
| likes_count | INTEGER | 点赞数 |
| favorites_count | INTEGER | 收藏数 |
| views | INTEGER | 阅读量 |
| created_at / updated_at | TIMESTAMPTZ | 时间戳 |

### comments（评论表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | SERIAL PK | 评论 ID |
| post_id | INTEGER FK → blogs | 所属文章 |
| author_id | INTEGER FK → users | 作者 |
| content | TEXT | 评论内容 |
| parent_id | INTEGER FK → comments | 父评论（NULL 为顶级） |
| likes_count | INTEGER | 点赞数 |
| created_at | TIMESTAMPTZ | 发表时间 |

### likes / favorites（点赞 / 收藏表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK → users | 用户 |
| post_id | INTEGER FK → blogs | 文章 |
| created_at | TIMESTAMPTZ | |

UNIQUE(user_id, post_id) 约束保证每人每篇文章只能点赞/收藏一次。

### personal_info（个人信息表）

单行表（id=1），JSONB 列存储社交链接、技能、时间线、兴趣爱好、照片墙。博主通过后台编辑。

### game_scores（游戏成绩表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | SERIAL PK | |
| user_id | INTEGER FK → users | 玩家 |
| level | INTEGER (1-8) | 关卡 |
| time_ms | INTEGER | 通关时间（毫秒） |
| created_at | TIMESTAMPTZ | |

UNIQUE(user_id, level) + UPSERT 策略：仅在新成绩更优时更新。

### files（文件表）

| 字段 | 类型 | 说明 |
|---|---|---|
| id | SERIAL PK | |
| uuid_filename | TEXT UNIQUE | UUID 文件名 |
| original_name | TEXT | 原始文件名 |
| mime_type | TEXT | MIME 类型 |
| size | BIGINT | 文件大小 |
| post_id | INTEGER FK → blogs | 关联文章（可空） |
| uploaded_by | INTEGER FK → users | 上传者 |
| download_count | INTEGER | 下载次数 |
| created_at | TIMESTAMPTZ | |

---

## API 接口

所有接口返回统一格式：`{ success: boolean, data: T, message?: string }`。分页接口额外包含 `total`、`page`、`pageSize`、`totalPages`。

### 认证 `/api/auth`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/api/auth/register` | 无 | 注册（用户名与博主名一致则自动成为 blogger） |
| POST | `/api/auth/login` | 无 | 登录（支持用户名或邮箱） |
| GET | `/api/auth/me` | Bearer | 获取当前登录用户信息 |
| POST | `/api/auth/change-password` | Bearer | 修改密码 |

### 文章 `/api/posts`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| GET | `/api/posts` | 无 | 文章列表（分页，可选 `?tag=` 筛选） |
| GET | `/api/posts/tags` | 无 | 获取全部标签 |
| GET | `/api/posts/:slug` | 无 | 文章详情（`?count=false` 跳过阅读计数） |
| POST | `/api/posts` | Bearer + blogger | 创建文章 |
| PUT | `/api/posts/:id` | Bearer + blogger | 更新文章 |
| DELETE | `/api/posts/:id` | Bearer + blogger | 删除文章（含关联文件） |

### 评论 `/api/posts/:postId/comments`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| GET | `/api/posts/:postId/comments` | 无 | 评论列表（含二级回复） |
| POST | `/api/posts/:postId/comments` | Bearer | 发表评论（支持 `parentId` 楼中楼） |
| DELETE | `/api/comments/:id` | Bearer | 删除评论（作者或博主） |

### 互动 `/api`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/api/posts/:postId/like` | Bearer | 切换点赞（toggle） |
| DELETE | `/api/posts/:postId/like` | Bearer | 取消点赞 |
| POST | `/api/posts/:postId/favorite` | Bearer | 切换收藏（toggle） |
| DELETE | `/api/posts/:postId/favorite` | Bearer | 取消收藏 |
| GET | `/api/user/favorites` | Bearer | 我的收藏列表 |
| GET | `/api/user/likes` | Bearer | 我的点赞列表 |

### 个人主页 `/api/profile`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| GET | `/api/profile` | 无 | 获取博主个人信息页 |
| PUT | `/api/profile` | Bearer + blogger | 更新个人信息页 |

### 用户 `/api/user`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| GET | `/api/user/profile` | Bearer | 获取当前用户资料 |
| PUT | `/api/user/profile` | Bearer | 更新昵称和头像 |

### 文件 `/api`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/api/upload` | Bearer + blogger | 上传文件 |
| POST | `/api/upload/download-url` | Bearer + blogger | 从 URL 下载图片 |
| GET | `/api/files` | 无 | 文件列表（分页，可选 `?postId=`） |
| GET | `/api/files/:id` | 无 | 文件元数据 |
| GET | `/api/files/:id/download` | 无 | 下载文件（计数 +1） |
| DELETE | `/api/files/:id` | Bearer + blogger | 删除文件 |

### 游戏排行榜 `/api/game-scores`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/api/game-scores` | Bearer | 提交成绩（仅保留最优） |
| GET | `/api/game-scores?level=&limit=` | 无 | 排行榜 |

### AI `/api/ai`

| 方法 | 路径 | 认证 | 说明 |
|---|---|---|---|
| POST | `/api/ai/chat` | Bearer + blogger | DeepSeek 聊天 |

### 健康检查

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/health` | 返回 `{ status: "ok", timestamp }` |

---

## 本地开发

### 1. 克隆项目

```bash
git clone git@github.com:HapLotes405/MyBlog.git
cd MyBlog
```

### 2. 安装依赖

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. 配置环境变量

```bash
cd backend
cp .env.example .env
```

编辑 `.env`：

```ini
PORT=8000
JWT_SECRET=your-secret-key-at-least-32-chars
DATABASE_URL=postgresql://postgres:password@localhost:5432/wiki
UPLOAD_DIR=./uploads
BLOGGER_USERNAME=HapLotes405
BLOGGER_EMAIL=admin@example.com
BLOGGER_PASSWORD=your-password
# 可选：AI 助手
DEEPSEEK_API_KEY=sk-xxx
CORS_ORIGIN=http://localhost:3000
```

### 4. 创建数据库

```sql
CREATE DATABASE wiki;
```

### 5. 初始化数据库

```bash
cd backend
npm run db:init    # 自动建表
npm run db:seed    # 创建博主账号
```

### 6. 启动服务

```bash
# 终端 1：后端（端口 8000）
cd backend
npm run dev

# 终端 2：前端（端口 3000）
cd frontend
npx next dev
```

打开 `http://localhost:3000`，用 `.env` 中配置的博主用户名和密码登录。

---

## Docker 部署

### 开发环境

```bash
# 1. 复制环境变量
cp .env.example .env
# 编辑 .env，填入配置

# 2. 启动全部服务（PostgreSQL + 后端 + 前端 + Nginx）
docker compose up -d

# 3. 初始化数据库
docker compose exec backend npx tsx src/db/migrate.ts
docker compose exec backend npx tsx src/db/seed.ts

# 4. 访问 http://localhost
```

开发环境服务架构：

```
浏览器 → Nginx (:80) → 前端 (:3000) / 后端 (:8000) → PostgreSQL (:5432)
                   ↳ Cloudflare Tunnel（可选，需要 CF_TUNNEL_TOKEN）
```

### 开发环境启用 Cloudflare Tunnel

```bash
CF_TUNNEL_TOKEN=your-token docker compose --profile tunnel up -d cloudflared
```

---

## 生产环境部署

生产环境使用 GHCR 预构建镜像 + Cloudflare Tunnel 绕过备案限制。

架构：

```
用户 → Cloudflare CDN (HTTPS) → Tunnel → Nginx (:80, 内网) → 前端 / 后端 → PostgreSQL
```

### 初次部署

```bash
# 1. 在服务器上准备目录
mkdir -p /opt/wiki
cd /opt/wiki

# 2. 复制部署文件
cp docker-compose.prod.yml /opt/wiki/
cp -r nginx/ /opt/wiki/
cp -r cloudflared/ /opt/wiki/
cp .env /opt/wiki/

# 3. 配置 Cloudflare Tunnel（见下方说明）

# 4. 拉取镜像并启动
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 配置 Cloudflare Tunnel

1. 在 Cloudflare Zero Trust 面板创建 Tunnel
2. 配置 Public Hostname 指向 `nginx:80`
3. 将 `config.yml` 和 token 放入 `cloudflared/` 目录
4. 在 `.env` 中设置 `CF_TUNNEL_TOKEN`

### 更新部署

CI/CD 自动完成，或手动执行：

```bash
cd /opt/wiki
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### 数据库备份

生产环境 `docker-compose.prod.yml` 包含自动备份服务：

- 每日凌晨 3 点自动执行 `pg_dump`
- 备份文件保存至 `./backup/` 目录
- 自动清理 7 天前的旧备份

---

## CI/CD

GitHub Actions 流水线（`.github/workflows/ci.yml`）：

```
Push/PR to master
  │
  ├─ Job 1: Verify
  │   ├─ Backend: TypeScript 编译检查
  │   └─ Frontend: Next.js 构建
  │
  ├─ Job 2: Docker (仅 master 分支)
  │   ├─ 构建 backend 镜像 → 推送 GHCR
  │   └─ 构建 frontend 镜像 → 推送 GHCR
  │
  ├─ Job 3: Deploy (仅 master 分支)
  │   └─ SSH 到 ECS → docker compose pull → up -d → 健康检查
  │
  └─ Job 4: Summary
```

镜像标签：`latest` + `git SHA`（`ghcr.io/haplotes405/myblog-backend` / `myblog-frontend`）。

---

## 环境变量

### 后端

| 变量 | 必填 | 说明 | 默认值 |
|---|---|---|---|
| `PORT` | 否 | 后端端口 | `8000` |
| `JWT_SECRET` | **是** | JWT 签名密钥 | — |
| `DATABASE_URL` | **是** | PostgreSQL 连接串 | — |
| `UPLOAD_DIR` | 否 | 上传文件目录 | `./uploads` |
| `BLOGGER_USERNAME` | 否 | 博主用户名 | `HapLotes405` |
| `BLOGGER_EMAIL` | **是** | 博主登录邮箱 | — |
| `BLOGGER_PASSWORD` | **是** | 博主登录密码 | — |
| `CORS_ORIGIN` | 否 | 允许的跨域来源（逗号分隔） | `http://localhost:3000` |
| `DEEPSEEK_API_KEY` | 否 | DeepSeek API Key（不设则 AI 功能不可用） | — |
| `DEEPSEEK_MODEL` | 否 | DeepSeek 模型名 | `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | 否 | API 地址 | `https://api.deepseek.com/v1` |
| `DEEPSEEK_KEY_FILE` | 否 | API Key 文件路径 | `./deepseek.key` |

### 前端（构建时）

| 变量 | 说明 | 默认值 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | 后端 API 地址 | `/api` |

### Docker Compose

| 变量 | 说明 | 默认值 |
|---|---|---|
| `DB_USER` | 数据库用户 | `postgres` |
| `DB_PASSWORD` | 数据库密码 | `changeme` |
| `DB_NAME` | 数据库名 | `wiki` |
| `BACKEND_PORT` | 后端暴露端口 | `8000` |
| `FRONTEND_PORT` | 前端暴露端口 | `3000` |
| `NGINX_HTTP_PORT` | Nginx 暴露端口 | `80` |
| `CF_TUNNEL_TOKEN` | Cloudflare Tunnel Token | — |

---

## 常见问题

**Q: 登录提示"用户名或密码错误"？**

确认已运行 `npm run db:seed`，且 `.env` 中的 `BLOGGER_USERNAME` 和 `BLOGGER_PASSWORD` 与登录输入一致。

**Q: 启动后端报 `Missing required environment variable`？**

检查 `backend/.env` 是否已创建。Docker 部署时检查 `.env` 文件是否在项目根目录。

**Q: PostgreSQL 连接失败？**

确认 PostgreSQL 服务已启动，`wiki` 数据库已手动创建，`DATABASE_URL` 中的用户名和密码正确。Docker 部署时确认 `db` 服务 healthy。

**Q: Docker 部署前端页面 404？**

Next.js standalone 模式下 `public/` 目录需显式复制。确认 `frontend/Dockerfile` 包含 `COPY --from=builder /app/public ./public`。

**Q: Cloudflare Tunnel 无法启动？**

检查 `CF_TUNNEL_TOKEN` 是否正确，`cloudflared/config.yml` 是否存在且配置正确。

**Q: AI 助手不可用？**

确认已设置 `DEEPSEEK_API_KEY` 环境变量，或将 API Key 写入 `deepseek.key` 文件挂载到容器。

**Q: 上传大文件失败？**

Nginx 和 multer 均已配置最大 100MB。如超过此限制，修改 `nginx/nginx.conf` 的 `client_max_body_size` 和 `backend/src/routes/upload.ts` 的 `limits.fileSize`。

**Q: 如何重置数据库？**

```bash
# Docker
docker compose exec db psql -U postgres -d wiki -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
docker compose exec backend npx tsx src/db/migrate.ts
docker compose exec backend npx tsx src/db/seed.ts

# 本地
psql -U postgres -d wiki -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
cd backend && npm run db:init && npm run db:seed
```
