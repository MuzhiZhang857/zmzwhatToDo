校园备忘录项目是一个基于 Django 框架的 Web 应用，旨在为校园用户提供一个记录、分享和管理日常事务的平台。项目前后端分离，前端使用 HTML、CSS 和 JavaScript 构建用户界面，后端使用 Django 和 Django REST Framework (DRF) 提供 API 接口。

### 主要功能

1. **用户认证**：支持用户注册、登录和注销。
2. **备忘录（帖子）管理**：用户可以发布、查看、点赞和评论备忘录。
3. **团队协作**：用户可以创建或加入团队，并在团队内发布备忘录。
4. **个人成就**：系统会根据用户活动解锁成就徽章。
5. **学习评估**：用户可以进行技能评估以了解自己的学习进度。
6. **学习日历**：以热力图的形式展示用户的发帖记录。
7. **校园地图**：集成百度地图，展示校园内的学习区域。
8. **待办事项**：用户可以创建和管理个人待办事项列表。

### 技术栈

* **前端**: HTML, CSS (Tailwind CSS), JavaScript, Font Awesome
* **后端**: Python, Django, Django REST Framework
* **数据库**: SQLite

### 项目结构

* **`backend/`**: Django 后端项目目录。
    * `users/`: 用户认证和管理模块。
    * `posts/`: 帖子、评论和点赞功能模块。
    * `todos/`: 待办事项模块。
* **`frontend/`**: 静态前端文件目录。
    * `index.html`: 主页面。
    * `login.html`: 登录页面。
    * `js/`: 包含各种功能的 JavaScript 文件（如 `app.js`, `theme-switcher.js`, `calendar.js` 等）。
    * `css/`: 样式文件。
    * `node_modules/`: 前端依赖库。

### 快速开始

1. **克隆项目**
   ```bash
   git clone https://gitee.com/muzhi4549/campus-memo-based-on-django.git
   cd campus-memo-based-on-django
   ```

2. **启动后端服务**
   ```bash
   cd backend
   python manage.py runserver
   ```
   后端服务将运行在 `http://127.0.0.1:8000`。

3. **访问前端页面**
   直接在浏览器中打开 `frontend/index.html` 文件即可访问应用。

### 许可证

本项目采用 MIT 许可证。
