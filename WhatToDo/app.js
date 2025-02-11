// 模拟的用户数据（实际应用中应该从后端获取）
const users = [
    { username: "admin", password: "password123" },
    { username: "user1", password: "user1pass" }
];

let currentUser = null;

// 显示/隐藏登录界面
document.getElementById('login-btn').addEventListener('click', function () {
    document.getElementById('login-section').classList.toggle('hidden');
});

// 登录功能
document.getElementById('login-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    // 检查用户名和密码是否匹配
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        alert("登录成功！");
        currentUser = user;
        document.getElementById('login-section').classList.add('hidden'); // 隐藏登录界面
    } else {
        alert("用户名或密码错误，请重试！");
    }
});

// 初始化地图
var map = L.map('map').setView([39.9042, 116.4074], 13); // 默认北京
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// 初始化日历（显示整个月份）
flatpickr("#calendar", {
    inline: true, // 显示整个月份的日历
    defaultDate: "today",
    onChange: function(selectedDates, dateStr, instance) {
        console.log("Selected date:", dateStr);
        // 在这里可以处理日期选择后的逻辑
    }
});

// 存储备忘录数据
let memos = [];

// 提交表单时保存备忘录
document.getElementById('post-form').addEventListener('submit', function (e) {
    e.preventDefault();

    const title = document.getElementById('title').value;
    const content = document.getElementById('content').value;
    const location = map.getCenter(); // 获取当前地图中心作为位置

    const memo = {
        title,
        content,
        location,
        comments: [] // 每条备忘录都有一个评论数组
    };

    memos.push(memo);
    renderMemos();
    this.reset();
});

// 渲染备忘录列表
function renderMemos() {
    const memoList = document.getElementById('memo-items');
    memoList.innerHTML = '';

    memos.forEach((memo, index) => {
        const memoItem = document.createElement('li');
        memoItem.classList.add('memo-item');

        memoItem.innerHTML = `
            <h3>${memo.title}</h3>
            <p>${memo.content}</p>
            <p>位置: ${memo.location.lat.toFixed(4)}, ${memo.location.lng.toFixed(4)}</p>
            
            <!-- 评论区域 -->
            <div class="comment-section">
                <h4>评论</h4>
                <ul class="comment-list" id="comments-${index}"></ul>
                <form class="comment-form" onsubmit="addComment(event, ${index})">
                    <input type="text" placeholder="发表评论..." required>
                    <button type="submit">评论</button>
                </form>
            </div>
        `;

        memoList.appendChild(memoItem);

        // 渲染评论列表
        renderComments(memo.comments, index);
    });
}

// 渲染评论列表
function renderComments(comments, memoIndex) {
    const commentList = document.getElementById(`comments-${memoIndex}`);
    commentList.innerHTML = '';

    comments.forEach(comment => {
        const commentItem = document.createElement('li');
        commentItem.classList.add('comment-item');
        commentItem.innerHTML = `<p>${comment}</p>`;
        commentList.appendChild(commentItem);
    });
}

// 添加评论
window.addComment = function (e, memoIndex) {
    e.preventDefault();

    const commentInput = e.target.querySelector('input');
    const commentText = commentInput.value;

    if (commentText) {
        memos[memoIndex].comments.push(commentText);
        renderComments(memos[memoIndex].comments, memoIndex);
        commentInput.value = ''; // 清空输入框
    }
};

// 快速检索功能
document.getElementById('search-input').addEventListener('input', function () {
    const query = this.value.toLowerCase();
    const filteredMemos = memos.filter(memo => 
        memo.title.toLowerCase().includes(query) || 
        memo.content.toLowerCase().includes(query)
    );

    renderFilteredMemos(filteredMemos);
});

function renderFilteredMemos(filteredMemos) {
    const memoList = document.getElementById('memo-items');
    memoList.innerHTML = '';

    filteredMemos.forEach((memo, index) => {
        const memoItem = document.createElement('li');
        memoItem.classList.add('memo-item');

        memoItem.innerHTML = `
            <h3>${memo.title}</h3>
            <p>${memo.content}</p>
            <p>位置: ${memo.location.lat.toFixed(4)}, ${memo.location.lng.toFixed(4)}</p>
            
            <!-- 评论区域 -->
            <div class="comment-section">
                <h4>评论</h4>
                <ul class="comment-list" id="comments-${index}"></ul>
                <form class="comment-form" onsubmit="addComment(event, ${index})">
                    <input type="text" placeholder="发表评论..." required>
                    <button type="submit">评论</button>
                </form>
            </div>
        `;

        memoList.appendChild(memoItem);

        // 渲染评论列表
        renderComments(memo.comments, index);
    });
}

// 发布代码功能
document.getElementById('add-code-btn').addEventListener('click', function () {
    const codeSnippet = prompt("请输入代码片段:");
    if (codeSnippet) {
        const contentArea = document.getElementById('content');
        const codeBlock = `
<div class="code-block">
    <div class="code-block-header">
        <span class="code-lang">text</span>
        <svg class="copy-btn" onclick="copyCode(this)" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2" ry="2"></rect>
            <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path>
        </svg>
    </div>
    <pre><code>${codeSnippet}</code></pre>
</div>
        `;
        contentArea.value += codeBlock;
    }
});

// 复制代码功能
window.copyCode = function (btn) {
    const codeBlock = btn.parentElement.nextElementSibling.querySelector('code');
    navigator.clipboard.writeText(codeBlock.innerText).then(() => {
        alert("代码已复制到剪贴板！");
    }).catch(err => {
        console.error('无法复制文本: ', err);
    });
};

// 发布文件功能
document.getElementById('add-file-btn').addEventListener('click', function ()