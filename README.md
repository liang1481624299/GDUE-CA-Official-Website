# 广东第二师范学院计算机协会 - 官方网站

> 广东第二师范学院（花都校区）计算机协会官方网站 - 前后端分离架构，含公开官网 + 管理员后台。

## 项目简介

本项目为【广东第二师范学院（花都校区）计算机协会】官方网站，前后端完全分离：

- **前端**（`frontend/`）：Next.js 16 App Router + TypeScript + Tailwind CSS + shadcn/ui
- **后端**（`backend/`）：FastAPI + SQLAlchemy 2.0 异步 + Pydantic v2 + JWT
- **特性**：4 语言国际化、深浅色主题、移动端右侧抽屉菜单、报名 / Bug 提交公开表单、管理员 Web 后台

前后端互相独立，仅通过 HTTP API 通信，无任何共享代码或运行时依赖。

## 技术栈

### 前端（`frontend/`）

| 类别 | 技术 |
| --- | --- |
| 框架 | Next.js 16（App Router, Turbopack） |
| 语言 | TypeScript 5 |
| UI | Tailwind CSS、shadcn/ui、Radix UI、Lucide Icons |
| 动画 | Framer Motion |
| 表单 | react-hook-form + zod |
| 国际化 | 自实现 i18n（4 语言：zh-CN / zh-TW / en / ja） |
| 主题 | 深浅色切换，localStorage 持久化，跟随系统 |
| 统计 | Umami（非 Google Analytics） |
| 性能 | HTTP/3、Priority Hints、Next.js Image 优化、ISR/SSG |
| SEO | sitemap.xml、robots.txt、schema.org EducationalOrganization |

### 后端（`backend/`）

| 类别 | 技术 |
| --- | --- |
| 框架 | FastAPI |
| ORM | SQLAlchemy 2.0 异步 |
| 数据库 | SQLite（开发）/ PostgreSQL（生产可换） |
| 校验 | Pydantic v2 |
| 鉴权 | JWT Bearer Token + bcrypt 密码哈希 |
| 导出 | openpyxl（Excel）、CSV（UTF-8 BOM + CRLF） |
| 部署 | uvicorn，host=`::` 同时监听 IPv4/IPv6 |
| 安全 | IP 黑名单、CORS 域名白名单、3 级角色（super_admin / admin / editor） |

## 项目结构

```
GDUECA/
├── frontend/                              # 【前端】Next.js App Router 全部前端代码
│   ├── app/                               # Next.js App Router 页面路由
│   │   ├── layout.tsx                     #   根 layout（html/body/字体/防 FOUC 主题脚本）
│   │   ├── globals.css                    #   全局样式 + 主题 CSS 变量
│   │   ├── sitemap.ts                      #   SEO sitemap
│   │   ├── robots.ts                       #   SEO robots
│   │   ├── [locale]/                       #   公开官网（4 语言路由前缀）
│   │   │   ├── layout.tsx                  #     根布局（Navbar/Footer/I18nProvider/Umami）
│   │   │   ├── page.tsx                    #     首页（唯一 page.tsx）
│   │   │   ├── about/page.tsx              #     社团介绍
│   │   │   ├── projects/page.tsx           #     项目展示
│   │   │   ├── projects/[slug]/page.tsx    #     项目详情
│   │   │   ├── events/page.tsx             #     活动公告
│   │   │   ├── join/page.tsx               #     报名入口（活动报名 / 社团报名 Tab）
│   │   │   ├── blog/page.tsx               #     技术博客
│   │   │   ├── blog/[slug]/page.tsx        #     博客详情
│   │   │   └── contact/page.tsx            #     联系我们 + Bug 反馈
│   │   └── admin/                          #   管理员后台（独立路由，无 locale 前缀）
│   │       ├── layout.tsx                  #     admin 根布局（zh-CN 固定）
│   │       ├── login/page.tsx              #     Web 登录页（含忘记密码/恢复入口）
│   │       ├── forgot-password/page.tsx    #     忘记密码申请表单（公开）
│   │       ├── recover/page.tsx           #     安全问题紧急恢复（公开）
│   │       ├── change-password/page.tsx   #     修改密码页
│   │       └── (dashboard)/                 #     登录后路由组
│   │           ├── layout.tsx              #       侧边栏 + 顶栏 + 路由守卫
│   │           ├── page.tsx                #       仪表盘首页
│   │           ├── profile/page.tsx        #       个人资料（显示名/真实姓名/学号/手机号/头像）
│   │           ├── activities/page.tsx     #       活动管理
│   │           ├── registrations/page.tsx  #       报名审阅 + 导出
│   │           ├── bugs/page.tsx           #       Bug 反馈列表
│   │           ├── password-resets/page.tsx #      忘记密码申请审核
│   │           └── settings/page.tsx       #       系统设置
│   ├── components/                         # 全部可复用组件，按业务子文件夹分类
│   │   ├── layout/                         #   布局类：导航栏 + 页脚
│   │   │   ├── NavDesktop.tsx              #     桌面端导航栏（持有 mobileOpen 状态）
│   │   │   ├── NavMobile.tsx               #     移动端右侧抽屉（接收 open/onClose）
│   │   │   ├── Footer.tsx                  #     页脚
│   │   │   ├── ThemeToggle.tsx             #     桌面端主题切换按钮
│   │   │   └── LanguageSwitcher.tsx        #     桌面端语言切换下拉
│   │   ├── home/                           #   首页模块：Hero / EventsPreview / ProjectsPreview / QuickNav / Announcements
│   │   ├── events/                         #   活动模块：EventsList / EventsChart
│   │   ├── blog/                           #   博客模块：BlogList / MarkdownRenderer
│   │   ├── projects/                       #   项目模块：ProjectList
│   │   ├── join/                           #   报名模块：EventJoinForm / ClubJoinForm / phoneRules
│   │   ├── contact/                        #   联系模块：BugForm
│   │   ├── shared/                         #   公共组件：PageHeader / SectionHeading
│   │   └── ui/                             #   通用基础 UI 组件（shadcn/ui：button/card/input/...）
│   ├── lib/                                # 工具函数与 API 请求封装
│   │   ├── api/                            #   API 请求封装，文件与后端 app/api/ 模块一一对应
│   │   │   ├── client.ts                   #     公共层（apiFetch / ApiError / getToken / API_BASE_URL）
│   │   │   ├── auth.ts                     #     ↔ 后端 app/api/auth.py（login / fetchMe）
│   │   │   ├── activities.ts               #     ↔ 后端 app/api/activities.py（CRUD）
│   │   │   ├── register.ts                 #     ↔ 后端 app/api/register.py（活动 / 社团报名）
│   │   │   ├── bugReport.ts                #     ↔ 后端 app/api/bug_report.py（Bug 提交 / 列表）
│   │   │   └── system.ts                   #     ↔ 后端 app/api/system.py（系统设置 / IP 黑名单）
│   │   ├── utils/                          #   通用工具函数（cn 等类名合并）
│   │   │   └── index.ts
│   │   ├── auth.ts                         #   管理员前端会话工具（getSession / logout / AdminSession）
│   │   ├── content.ts                      #   Markdown 内容加载器（blog/events/projects）
│   │   └── i18n.ts                         #   语言列表 / 类型（locales / Locale / localeNames）
│   ├── i18n/                               # 国际化
│   │   ├── provider.tsx                    #   客户端 i18n Context + useI18n
│   │   ├── dictionary.ts                   #   服务端字典加载器
│   │   └── messages/                       #   4 语言文案
│   │       ├── zh-CN.json
│   │       ├── zh-TW.json
│   │       ├── en.json
│   │       └── ja.json
│   ├── types/                              # TypeScript 类型定义
│   │   └── api.ts                          #   后端 API 实体类型（与后端 schemas 一一对应）
│   ├── content/                            # Markdown 数据文件（blog / events / projects，非文档）
│   │   ├── blog/
│   │   ├── events/
│   │   └── projects/
│   ├── public/                             # 静态资源
│   ├── next.config.ts                      # Next.js 配置（HTTP/3 / 图片 / 安全头）
│   ├── tsconfig.json                       # TypeScript 配置（@/* → frontend/./*）
│   ├── postcss.config.mjs                  # PostCSS / Tailwind v4
│   ├── eslint.config.mjs                   # ESLint
│   ├── proxy.ts                            # Next.js Proxy（原 middleware）：国际化路由
│   ├── package.json
│   └── pnpm-lock.yaml
│
├── backend/                                # 【后端】FastAPI 全部后端代码
│   ├── app/
│   │   ├── main.py                         #   入口（lifespan 建表 + 超管初始化 + 路由注册）
│   │   ├── core/
│   │   │   ├── config.py                   #   配置（.env / Pydantic Settings）
│   │   │   ├── security.py                 #   JWT + bcrypt + 角色依赖
│   │   │   └── middleware.py               #   IP 黑名单 + Host 白名单中间件
│   │   ├── db/
│   │   │   ├── models.py                   #   ORM 模型（User / Activity / Registration / BugReport / SystemSetting）
│   │   │   └── session.py                  #   异步会话工厂
│   │   ├── api/                            #   接口模块，与前端 lib/api/ 文件一一对应
│   │   │   ├── auth.py                     #     ↔ 前端 lib/api/auth.ts
│   │   │   ├── activities.py               #     ↔ 前端 lib/api/activities.ts
│   │   │   ├── register.py                 #     ↔ 前端 lib/api/register.ts
│   │   │   ├── bug_report.py               #     ↔ 前端 lib/api/bugReport.ts
│   │   │   └── system.py                   #     ↔ 前端 lib/api/system.ts
│   │   ├── schemas/                        #   Pydantic 模型（含手机号区号校验）
│   │   │   ├── auth.py / activity.py / register.py / bug.py / system.py
│   │   │   └── __init__.py
│   │   └── utils/
│   │       └── export.py                   #   CSV / Xlsx 导出（学号 / 手机号强制文本）
│   ├── run.py                              #   uvicorn 启动器（host="::" IPv4/IPv6 双栈）
│   ├── requirements.txt
│   └── .env.example
│
└── README.md                               # 本文件（项目唯一 markdown 文档）
```

## 前后端分离说明

- **物理分离**：前端代码全部在 `frontend/`，后端代码全部在 `backend/`，两者作为独立子项目维护。
- **通信方式**：仅通过 HTTP API 通信，前端通过 `NEXT_PUBLIC_API_BASE_URL` 环境变量配置后端地址（默认 `http://localhost:8000`）。
- **类型对应**：前端 `types/api.ts` 中的实体类型与后端 `app/schemas/*.py` 中的 Pydantic 模型一一对应。
- **接口对应**：前端 `lib/api/*.ts` 与后端 `app/api/*.py` 文件一一对应（见上表），方便查找维护。
- **无共享代码**：前后端无共享模块、无共享类型包、无运行时耦合。

## 关键路径

### 公开网站（前端）

| 路径 | 说明 |
| --- | --- |
| `/zh-CN` `/zh-TW` `/en` `/ja` | 4 语言首页 |
| `/[locale]/about` | 社团介绍 |
| `/[locale]/projects` | 项目展示 |
| `/[locale]/events` | 活动公告 |
| `/[locale]/join` | 报名入口（活动报名 / 社团报名 Tab 切换） |
| `/[locale]/blog` | 技术博客 |
| `/[locale]/contact` | 联系我们 + Bug 反馈表单 |

### 管理员后台

| 路径 | 说明 | 权限 |
| --- | --- | --- |
| `/admin/login` | Web 登录页（含忘记密码 / 账号恢复入口） | 公开 |
| `/admin/forgot-password` | 忘记密码申请表单 | 公开 |
| `/admin/recover` | 安全问题紧急恢复 | 公开 |
| `/admin/change-password` | 修改密码页（首次登录强制跳转） | 已登录 |
| `/admin` | 仪表盘（统计概览） | 已登录 |
| `/admin/profile` | 个人资料（显示名 / 真实姓名 / 学号 / 手机号 / 头像上传） | 已登录 |
| `/admin/activities` | 活动 CRUD | editor+ |
| `/admin/registrations` | 报名审阅 + CSV/Xlsx 导出 | admin+ |
| `/admin/bugs` | Bug 反馈列表 + 标记已解决 | editor+ |
| `/admin/password-resets` | 忘记密码申请审核 | admin+ |
| `/admin/settings` | 系统配置（IP 黑名单 / CORS / 安全问题） | admin+ |

### 后端 API（FastAPI）

| 方法 | 路径 | 说明 | 鉴权 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 登录获取 JWT | 公开 |
| GET | `/api/auth/me` | 当前用户信息 | Bearer |
| GET | `/api/auth/profile` | 当前用户完整资料 | Bearer |
| PUT | `/api/auth/profile` | 更新个人资料（显示名/真实姓名/学号/手机号） | Bearer |
| POST | `/api/auth/avatar` | 上传头像（JPG/PNG/WEBP，≤5MB） | Bearer |
| POST | `/api/auth/change-password` | 修改密码 | Bearer |
| POST | `/api/auth/forgot-password` | 提交忘记密码申请 | 公开 |
| GET | `/api/auth/password-resets` | 忘记密码申请列表 | admin+ |
| PATCH | `/api/auth/password-resets/{id}` | 处理忘记密码申请 | admin+ |
| GET | `/api/auth/security-question` | 获取安全问题（不含答案） | 公开 |
| POST | `/api/auth/recover` | 安全问题紧急恢复 | 公开 |
| PUT | `/api/auth/security-question` | 修改安全问题 | super_admin |
| GET | `/api/auth/users` | 用户列表 | super_admin |
| POST | `/api/auth/users` | 创建用户（含学号/真实姓名/手机号） | super_admin |
| DELETE | `/api/auth/users/{id}` | 删除用户 | super_admin |
| GET | `/api/activities` | 活动列表 | 公开 |
| POST | `/api/activities` | 创建活动 | editor+ |
| PATCH | `/api/activities/{id}` | 修改活动 | editor+ |
| DELETE | `/api/activities/{id}` | 删除活动 | admin+ |
| POST | `/api/registrations/for/{activity_id}` | 活动报名提交 | 公开 |
| POST | `/api/registrations/club` | 社团报名提交 | 公开 |
| GET | `/api/registrations` | 报名列表 | admin+ |
| PATCH | `/api/registrations/{id}` | 修改报名状态 | admin+ |
| GET | `/api/registrations/export` | 导出 CSV/Xlsx | admin+ |
| POST | `/api/bugs` | 公开 Bug 反馈 | 公开 |
| GET | `/api/bugs` | Bug 列表 | editor+ |
| PATCH | `/api/bugs/{id}` | 标记已解决 | admin+ |
| GET/PUT | `/api/system/settings` | 系统配置 | GET 公开 / PUT admin+ |
| POST/DELETE | `/api/system/ip-blacklist` | IP 黑名单 | admin+ |
| GET | `/uploads/avatars/{file}` | 头像静态文件 | 公开 |
| GET | `/health` | 健康检查 | 公开 |

## 启动方式

### 1. 启动后端

```bash
cd backend
pip install -r requirements.txt
python run.py
# 监听 http://localhost:8000 + http://[::]:8000（IPv4/IPv6 双栈）
```

后端启动时会自动建表并创建超级管理员（由 `.env` 中 `FIRST_SUPERADMIN_EMAIL` / `FIRST_SUPERADMIN_PASSWORD` 配置，默认 `admin` / `admin`）。

> **首次登录强制改密**：默认密码 `admin/admin` 登录后会自动跳转到修改密码页，必须设置新密码（至少 6 位）才能进入后台。

### 默认账号

| 字段 | 值 |
| --- | --- |
| 用户名 | `admin` |
| 密码 | `admin`（首次登录强制修改） |
| 邮箱 | `admin@gdue-ca.cn` |
| 角色 | `super_admin` |

### 忘记密码 / 账号恢复

- **忘记密码**：登录页点击「忘记密码？」→ 填写联系邮箱 + 原因 → 提交申请 → 管理员在 `/admin/password-resets` 审核后手动联系
- **安全问题恢复**：所有管理员账号全部失能时，登录页点击「账号恢复」→ 回答安全问题（默认：计算机协会成立于哪一年？答案：2008）→ 重置超管密码并重新启用
- 安全问题可在 `/admin/settings` 由 super_admin 修改（PUT `/api/auth/security-question`）

### 2. 启动前端

```bash
cd frontend
pnpm install      # 或 npm install
pnpm run dev      # 或 npm run dev
# 访问 http://localhost:3000
```

设置后端地址（可选，默认 `http://localhost:8000`）：

```bash
# frontend/.env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 3. 访问管理员后台

- 前端导航栏右上角点击盾牌头像按钮，或访问 `/admin`
- 未登录会自动跳转到 `/admin/login`
- 输入用户名 / 密码登录后进入仪表盘

### 4. 报名流程

1. 管理员在 `/admin/activities` 创建活动，将状态改为 `registration_open`
2. 用户访问 `/[locale]/join`，在 Tab 中选择「活动报名」或「社团报名」
   - **活动报名**：选择活动，填写表单 → `POST /api/registrations/for/{activityId}`
   - **社团报名**：选择意向部门（活动部 / 办公室 / 外联部 / 宣传部 / 财务部）→ `POST /api/registrations/club`
3. 手机号字段自动按所选区号规范校验：
   - 中国大陆 +86：11 位，1 开头
   - 中国香港 +852：8 位，5-9 开头
   - 英国 +44：10 位，7 开头
   - 美国 / 加拿大 +1：10 位
   - 日本 +81、韩国 +82、新加坡 +65、其他 24 个区号均有规范
4. 管理员在 `/admin/registrations` 查看报名，可按类型 / 活动 / 状态筛选、修改状态（通过 / 拒绝 / 签到）、导出 CSV/Excel

### 5. Bug 反馈流程

1. 用户访问 `/[locale]/contact`，页面下半部分是 Bug 反馈表单
2. 填写标题 / 详细描述 / 联系方式（邮箱或手机号，可选）/ 页面 URL（可选）
3. 提交后管理员在 `/admin/bugs` 查看反馈，可标记已解决 / 重新打开

## 开发维护规范

### 组件划分规则

- **导航栏**：仅 2 个 tsx 文件 —— `components/layout/NavDesktop.tsx`（桌面端 header，持有 mobileOpen 状态）+ `components/layout/NavMobile.tsx`（移动端抽屉，接收 `open` / `onClose` props）。禁止新增第三个导航栏 tsx 文件。
- **页面卡片 / 模块组件**：同一卡片逻辑只保留一个 tsx 文件，按业务子文件夹归类（`home/` / `events/` / `blog/` / `projects/` / `join/` / `contact/` / `shared/`），禁止同一卡片逻辑散落多个文件。
- **通用 UI 组件**：shadcn/ui 基础组件统一放 `components/ui/`，不与业务组件混放。

### 页面编写规则

- 每个路由页面**只保留 1 个 `page.tsx`**，页面内的卡片 / 表单模块全部抽离到 `components/` 对应业务子文件夹。
- 页面 `page.tsx` 只负责数据获取 / 路由参数处理 / 组件组合，不写大段内联 JSX 卡片。
- 路由组（如 `admin/(dashboard)/`）通过 `layout.tsx` 提供共享布局（侧边栏 / 顶栏 / 路由守卫）。

### 前后端接口对应规则

- 后端 `backend/app/api/*.py` 与前端 `frontend/lib/api/*.ts` **文件名一一对应**：
  - `auth.py` ↔ `auth.ts`
  - `activities.py` ↔ `activities.ts`
  - `register.py` ↔ `register.ts`
  - `bug_report.py` ↔ `bugReport.ts`
  - `system.py` ↔ `system.ts`
- 前端调用某后端接口时，**必须从对应业务模块导入**（如 `import { listActivities } from "@/lib/api/activities"`），不使用统一 barrel，方便定位。
- 公共请求层 `lib/api/client.ts` 提供 `apiFetch` / `ApiError` / `getToken` / `API_BASE_URL`，业务模块基于此实现具体接口。
- 实体类型集中在 `frontend/types/api.ts`，业务模块和页面统一从此处导入类型。

## 使用手册

### 管理员角色权限

| 角色 | 权限 |
| --- | --- |
| `super_admin` | 全部权限，包含用户管理、安全问题管理 |
| `admin` | 活动管理、报名审阅 / 导出、Bug 处理、忘记密码申请审核、系统设置 |
| `editor` | 活动管理、Bug 查看、个人资料编辑 |

### 账号信息

每个管理员账号包含以下信息：

| 字段 | 说明 | 可修改 |
| --- | --- | --- |
| `username` | 显示名称（用于显示和登录） | ✅ 在 `/admin/profile` 修改 |
| `real_name` | 真实姓名 | ✅ 在 `/admin/profile` 修改 |
| `student_id` | 学号（用于身份验证） | ✅ 在 `/admin/profile` 修改 |
| `phone` | 手机号（含国际区号，如 +8613800000000） | ✅ 在 `/admin/profile` 修改 |
| `email` | 邮箱（不可修改） | ❌ |
| `avatar_url` | 头像 URL | ✅ 上传 JPG/PNG/WEBP（≤5MB） |
| `role` | 角色 | ❌ 仅 super_admin 可创建用户时指定 |

- 个人资料页：`/admin/profile`（侧边栏底部点击用户名进入）
- 头像上传：支持 JPG / PNG / WEBP，最大 5MB，存储于后端 `uploads/avatars/`

### 数据导出

- **CSV**：UTF-8 + BOM + CRLF，Excel 直接打开不乱码
- **Excel**：`.xlsx` 格式，学号和手机号列强制 `@` 文本格式，避免长数字被科学计数法

### 国际化

- 公开官网支持 4 语言：`zh-CN` / `zh-TW` / `en` / `ja`
- 切换语言：导航栏右上角下拉切换（桌面）/ 抽屉「设置」区切换（移动端）
- 管理员后台固定使用 `zh-CN`

### 深浅色主题

- 公开官网支持深浅色切换
- 切换入口：导航栏主题切换按钮（桌面）/ 抽屉「设置」区（移动端）
- 主题持久化到 localStorage，未设置时跟随系统 `prefers-color-scheme`
- 防 FOUC：通过 `next/script` + `beforeInteractive` 在 hydration 前设置主题类
- 管理员后台共用相同主题机制

### 移动端菜单

- 桌面端：横向导航栏
- 移动端：右侧抽屉式菜单
  - 适配浏览器 / 安卓返回键（pushState + popstate）
  - 适配触摸手势：向右滑动 > 80px 或速度 > 400 关闭
  - 点击外侧遮罩关闭
  - 设置区含深浅色 + 语言切换（从设置按钮下方自然向下展开，非覆盖式弹出）

### 安全配置

- **CORS 域名白名单**：在 `/admin/settings` 配置允许的前端来源
- **IP 黑名单**：支持 IPv4/IPv6/CIDR 段，30s 缓存
- **JWT Bearer Token**：管理员登录后获取，存于 localStorage，自动附加到请求头
- **导出接口 token**：通过 query 参数 `?token=xxx` 传递（用于浏览器直接打开下载）

## 性能与 SEO

- HTTP/3 启用（Alt-Svc 头，实际由 Cloudflare CDN 层启用）
- Priority Hints 预连接关键资源
- Next.js Image 组件优化图片
- sitemap.xml + robots.txt
- schema.org EducationalOrganization 结构化数据
- Umami 网站统计（非 Google Analytics）
- ISR/SSG 静态渲染

## 部署

### 前端

```bash
cd frontend
pnpm run build
pnpm start
# 或部署到 Vercel / Cloudflare Pages
```

### 后端

```bash
cd backend
# 生产环境推荐 gunicorn + uvicorn worker
gunicorn -k uvicorn.workers.UvicornWorker -b [::]:8000 app.main:app
```

## 约束

- 禁止：电子商务、支付、广告、会员费、CRM、再营销等商业功能
- 必须：4 语言国际化、深浅色主题、移动端响应式、CORS 限定到 `gdue-ca.paperee.guru`
- 主色：蓝色
- 报名人员无账号，无法登录后端
- 报名系统明确区分活动报名和社团报名，分别使用不同表单和提交接口

## 版权声明

© 广东第二师范学院计算机协会。本项目源代码仅供社团内部学习与运营使用，未经许可不得用于商业用途。
