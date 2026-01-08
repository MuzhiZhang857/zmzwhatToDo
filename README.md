

# 校园备忘录 (Campus Memo)

基于 Django + Django REST Framework 构建的校园 Web 应用。这是一个前后端分离的项目，前端采用现代化的静态页面技术，后端提供标准的 RESTful API 接口。

## ✨ 主要功能

1.  **用户系统**：支持用户注册、登录，集成 JWT (JSON Web Token) 认证机制。
2.  **备忘录 (Post)**：用户可以发布日常事务，支持**富文本/清单模式**、图片附件上传、点赞与评论互动。
3.  **团队协作**：用户可以创建专属团队，生成邀请码邀请同学加入，并在团队内部分享备忘录。
4.  **待办事项**：内置个人待办清单 (Todo List)，帮助管理日常学习任务。
5.  **学习热力图**：通过 `stats` 模块统计用户发帖频率，以 GitHub 风格的热力图形式展示学习活跃度。
6.  **校园地图**：集成百度地图 API，可视化展示校园内的学习区域。
7.  **主题切换**：支持亮色/暗色模式切换，保护视力。
8.  **粒子特效**：首页带有动态粒子背景（particles.js）。

## 🛠 技术栈

### 后端 (Backend)
*   **Python 3.x**: 主要开发语言
*   **Django 5.x**: Web 框架
*   **Django REST Framework (DRF)**: API 开发工具包
*   **SQLite**: 轻量级数据库（默认配置）
*   **SimpleJWT**: 处理 Token 认证

### 前端 (Frontend)
*   **HTML5 / JavaScript (ES6+)**: 核心结构与逻辑
*   **Tailwind CSS**: 实用主义的原子化 CSS 框架
*   **Font Awesome**: 图标库
*   **Baidu Map SDK**: 地图展示

## 📂 项目结构

```text
campus-memo/
├── backend/                 # Django 后端项目
│   ├── backend/            # 项目核心配置 (settings, urls, wsgi)
│   ├── users/              # 用户认证与管理模块
│   ├── posts/              # 帖子、评论、点赞、附件模块
│   ├── todos/              # 待办事项模块
│   ├── teams/              # 团队协作模块
│   ├── stats/              # 数据统计 (日历热力图)
│   └── manage.py           # Django 管理脚本
│
├── frontend/               # 静态前端文件目录
│   ├── index.html          # 主应用入口
│   ├── login.html          # 登录页面
│   ├── admin.html          # 简易管理页面
│   ├── css/                # 样式文件 (主要是 Tailwind 编译后的 CSS)
│   ├── js/                 # 业务逻辑 JavaScript 代码
│   │   ├── app.js          # 主应用逻辑
│   │   ├── api.js          # API 请求封装
│   │   ├── calendar.js     # 日历热力图逻辑
│   │   ├── map.js          # 百度地图逻辑
│   │   └── ...
│   └── node_modules/       # 前端依赖库
│
├── LICENSE                 # MIT 许可证
└── README.md               # 说明文档
```

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://gitee.com/muzhi4549/campus-memo-based-on-django.git
cd campus-memo-based-on-django
```

### 2. 启动后端服务

确保你已经安装了 Python 3。

```bash
# 进入后端目录
cd backend

# 安装依赖
pip install -r requirements.txt

# 执行数据库迁移
python manage.py migrate

# 启动开发服务器
python manage.py runserver
```
*后端服务默认运行在 `http://127.0.0.1:8000`*

### 3. 访问前端页面

本项目前端为纯静态文件。在开发阶段，你可以采用以下任意一种方式运行：

**方法 A (推荐): 使用 IDE 打开**
直接使用 VS Code 或 PyCharm 打开 `frontend/index.html` 文件，在浏览器中预览。
*注意：由于浏览器安全策略，直接打开本地 HTML 文件可能会导致某些 API 请求或资源配置失败。如果遇到问题，请使用以下方法 B。*

**方法 B: 启动简易 HTTP 服务器**
在 `frontend` 目录下运行 Python 简易服务器：

```bash
cd frontend
# Python 3
python -m http.server 8080
```
然后在浏览器访问 `http://127.0.0.1:8080`。

## 📖 API 文档概览

后端主要提供以下 API 端点：

*   **Users (`/api/users/`)**:
    *   `POST /register/`: 用户注册
    *   `POST /login/`: 用户登录
    *   `GET /me/`: 获取当前用户信息
*   **Posts (`/api/posts/`)**:
    *   `GET /`: 获取帖子列表
    *   `POST /`: 创建新帖子
    *   `POST /<id>/like/`: 点赞/取消点赞
    *   `POST /<id>/comment/`: 发表评论
*   **Teams (`/api/teams/`)**:
    *   `GET /`: 获取我创建或加入的团队列表
    *   `POST /create/`: 创建团队
    *   `POST /join/`: 通过邀请码加入团队
*   **Stats (`/api/stats/`)**:
    *   `GET /calendar/`: 获取日历热力图数据

*(详细 API 文档可参考后端 `views.py` 或通过 DRF 自带的 Swagger 界面查看)*

## 🤝 贡献指南

欢迎对本项目进行改进！如果你想要贡献代码，请 Fork 本仓库，并提交 Pull Request。

1.  Fork 仓库
2.  创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3.  提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4.  推送到分支 (`git push origin feature/AmazingFeature`)
5.  开启一个 Pull Request

## 📄 许可证

本项目基于 MIT 许可证开源。这意味着你可以免费使用、修改和分发本项目的代码，但需要包含原始许可证声明。详情请参阅 [LICENSE](LICENSE) 文件。