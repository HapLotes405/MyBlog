# MyBlog

个人博客系统。Markdown 写作 + 评论 + 标签分类，前后端分离。

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | Next.js 16 + React 19 + TypeScript |
| 后端 | Express + TypeScript |
| 数据库 | PostgreSQL |
| 认证 | JWT + bcrypt |

## 快速开始

需要 Node.js ≥ 18、PostgreSQL ≥ 14。

```bash
# 1. 安装依赖
cd backend && npm install
cd ../frontend && npm install

# 2. 配置环境变量
cd ../backend
cp .env.example .env
# 编辑 .env，填入数据库连接、JWT密钥、博主邮箱/密码

# 3. 初始化数据库
npm run db:init   # 建表
npm run db:seed   # 创建博主账号

# 4. 启动
npm run dev        # 后端 :8000
```

另开终端：

```bash
cd frontend
npx next dev       # 前端 :3000
```

打开 `http://localhost:3000`，用 `.env` 中设置的博主邮箱和密码登录。

## 项目结构

```
backend/src/
  config/       环境变量
  db/           数据库连接、迁移、种子
  middleware/    JWT 认证
  routes/       API 路由（auth, blog, comment, upload）
  types/        类型定义
  utils/        工具函数

frontend/src/
  app/          Next.js App Router 页面
  components/   UI 组件
  context/      React Context
  services/     API 封装
  types/        类型定义
  utils/        工具函数
```

## 功能

- Markdown 编辑器，图片/视频上传，实时预览
- 文章发布、编辑、删除，标签分类，全文搜索
- 评论与回复（需登录）
- 点赞收藏
- JWT 鉴权，博主独有写作和管理权限
