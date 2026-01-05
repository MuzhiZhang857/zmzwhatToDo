
// self_improvement_assistant/frontend/js/team.js
/**
 * 团队功能模块
 * 负责团队创建、加入和管理功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化团队系统
    initTeamSystem();
    
    // 绑定创建团队按钮事件
    document.getElementById('create-team-btn')?.addEventListener('click', showCreateTeamModal);
    
    // 绑定加入团队按钮事件
    document.getElementById('join-team-btn')?.addEventListener('click', showJoinTeamModal);
});

/**
 * 初始化团队系统
 */
function initTeamSystem() {
    // 检查本地存储中是否有团队数据
    if (!localStorage.getItem('teams')) {
        // 初始化默认团队数据
        const defaultTeams = [
            {
                id: 'team1',
                name: '计算机科学学习小组',
                description: '一起学习数据结构与算法',
                creator: '张三',
                createdAt: new Date().toISOString(),
                members: ['张三', '李四'],
                memos: [],
                isPublic: true
            },
            {
                id: 'team2',
                name: '高等数学讨论组',
                description: '共同攻克数学难题',
                creator: '李老师',
                createdAt: new Date(Date.now() - 86400000).toISOString(),
                members: ['李老师', '王五', '赵六'],
                memos: [],
                isPublic: true
            }
        ];
        localStorage.setItem('teams', JSON.stringify(defaultTeams));
    }
    
    // 检查用户是否有团队数据
    if (!localStorage.getItem('userTeams')) {
        localStorage.setItem('userTeams', JSON.stringify([]));
    }
    
    // 加载团队列表
    loadTeamList();
}

/**
 * 显示创建团队模态框
 */
function showCreateTeamModal() {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">创建新团队</h3>
                <button class="text-gray-500 hover:text-gray-700 close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <form id="create-team-form" class="space-y-4">
                <div>
                    <label for="team-name" class="block text-sm font-medium text-gray-700 mb-1">团队名称</label>
                    <input type="text" id="team-name" name="team-name" required
                        class="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="输入团队名称">
                </div>
                <div>
                    <label for="team-description" class="block text-sm font-medium text-gray-700 mb-1">团队描述</label>
                    <textarea id="team-description" name="team-description" rows="3"
                        class="w-full px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="输入团队描述"></textarea>
                </div>
                <div>
                    <label class="flex items-center">
                        <input type="checkbox" id="team-public" name="team-public" class="mr-2">
                        <span class="text-sm text-gray-700">公开团队（其他人可以搜索并加入）</span>
                    </label>
                </div>
                <div class="flex justify-end space-x-3">
                    <button type="button" class="px-4 py-2 border border-gray-300 rounded-md text-sm close-modal">
                        取消
                    </button>
                    <button type="submit" class="px-4 py-2 bg-black text-white rounded-md text-sm">
                        创建
                    </button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭按钮事件
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    });
    
    // 绑定表单提交事件
    modal.querySelector('#create-team-form').addEventListener('submit', function(e) {
        e.preventDefault();
        createTeam(this);
        document.body.removeChild(modal);
    });
}

/**
 * 创建新团队
 * @param {HTMLFormElement} form 表单元素
 */
function createTeam(form) {
    const teamName = form.querySelector('#team-name').value.trim();
    const teamDescription = form.querySelector('#team-description').value.trim();
    const isPublic = form.querySelector('#team-public').checked;
    
    if (!teamName) {
        alert('请输入团队名称');
        return;
    }
    
    // 获取当前用户信息
    const currentUser = localStorage.getItem('userEmail')?.split('@')[0] || '匿名用户';
    
    // 创建团队对象
    const newTeam = {
        id: 'team-' + Date.now(),
        name: teamName,
        description: teamDescription,
        creator: currentUser,
        createdAt: new Date().toISOString(),
        members: [currentUser],
        memos: [],
        isPublic: isPublic
    };
    
    // 保存到团队列表
    const teams = JSON.parse(localStorage.getItem('teams')) || [];
    teams.push(newTeam);
    localStorage.setItem('teams', JSON.stringify(teams));
    
    // 添加到用户团队列表
    const userTeams = JSON.parse(localStorage.getItem('userTeams')) || [];
    userTeams.push(newTeam.id);
    localStorage.setItem('userTeams', JSON.stringify(userTeams));
    
    // 重新加载团队列表
    loadTeamList();
    
    // 显示成功消息
    showNotification(`团队"${teamName}"创建成功！`);
}

/**
 * 显示加入团队模态框
 */
function showJoinTeamModal() {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">加入团队</h3>
                <button class="text-gray-500 hover:text-gray-700 close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <label for="search-team" class="block text-sm font-medium text-gray-700 mb-1">搜索团队</label>
                    <div class="relative">
                        <input type="text" id="search-team" name="search-team"
                            class="w-full px-3 py-2 border border-gray-300 rounded-md"
                            placeholder="输入团队名称或ID">
                        <div class="absolute inset-y-0 right-0 flex items-center pr-3">
                            <i class="fas fa-search text-gray-400"></i>
                        </div>
                    </div>
                </div>
                <div id="team-search-results" class="max-h-60 overflow-y-auto">
                    <!-- 搜索结果将在这里显示 -->
                </div>
                <div class="flex justify-end">
                    <button type="button" class="px-4 py-2 border border-gray-300 rounded-md text-sm close-modal">
                        取消
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭按钮事件
    modal.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.body.removeChild(modal);
        });
    });
    
    // 绑定搜索事件
    modal.querySelector('#search-team').addEventListener('input', function() {
        searchTeams(this.value.trim());
    });
    
    // 初始加载公开团队
    searchTeams('');
}

/**
 * 搜索团队
 * @param {String} query 搜索关键词
 */
function searchTeams(query) {
    const teams = JSON.parse(localStorage.getItem('teams')) || [];
    const userTeams = JSON.parse(localStorage.getItem('userTeams')) || [];
    const currentUser = localStorage.getItem('userEmail')?.split('@')[0] || '匿名用户';
    
    // 过滤已加入的团队和私有团队
    const filteredTeams = teams.filter(team => {
        return (team.isPublic || team.creator === currentUser) && 
               !userTeams.includes(team.id) &&
               (team.name.includes(query) || team.id.includes(query));
    });
    
    const resultsContainer = document.getElementById('team-search-results');
    resultsContainer.innerHTML = '';
    
    if (filteredTeams.length === 0) {
        resultsContainer.innerHTML = '<p class="text-sm text-gray-500 text-center py-4">没有找到匹配的团队</p>';
        return;
    }
    
    filteredTeams.forEach(team => {
        const teamElement = document.createElement('div');
        teamElement.className = 'team-card p-3 border border-gray-200 rounded-md mb-2';
        teamElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium">${team.name}</h4>
                    <p class="text-sm text-gray-600">${team.description || '暂无描述'}</p>
                    <p class="text-xs text-gray-500 mt-1">创建者: ${team.creator} • 成员: ${team.members.length}</p>
                </div>
                <button class="join-team-btn px-3 py-1 bg-blue-500 text-white text-sm rounded-md" 
                    data-team-id="${team.id}">
                    加入
                </button>
            </div>
        `;
        
        resultsContainer.appendChild(teamElement);
        
        // 绑定加入按钮事件
        teamElement.querySelector('.join-team-btn').addEventListener('click', function() {
            joinTeam(team.id);
            document.body.removeChild(document.querySelector('.fixed.inset-0'));
        });
    });
}

/**
 * 加入团队
 * @param {String} teamId 团队ID
 */
function joinTeam(teamId) {
    // 获取当前用户信息
    const currentUser = localStorage.getItem('userEmail')?.split('@')[0] || '匿名用户';
    
    // 更新团队数据
    const teams = JSON.parse(localStorage.getItem('teams')) || [];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex !== -1) {
        // 检查是否已加入
        if (teams[teamIndex].members.includes(currentUser)) {
            alert('您已经是该团队成员');
            return;
        }
        
        // 添加用户到团队成员
        teams[teamIndex].members.push(currentUser);
        localStorage.setItem('teams', JSON.stringify(teams));
        
        // 添加到用户团队列表
        const userTeams = JSON.parse(localStorage.getItem('userTeams')) || [];
        userTeams.push(teamId);
        localStorage.setItem('userTeams', JSON.stringify(userTeams));
        
        // 重新加载团队列表
        loadTeamList();
        
        // 显示成功消息
        showNotification(`成功加入团队"${teams[teamIndex].name}"！`);
    } else {
        alert('团队不存在');
    }
}

/**
 * 加载团队列表
 */
function loadTeamList() {
    const teamListContainer = document.getElementById('team-list');
    if (!teamListContainer) return;
    
    const userTeams = JSON.parse(localStorage.getItem('userTeams')) || [];
    const teams = JSON.parse(localStorage.getItem('teams')) || [];
    
    // 清空现有内容
    teamListContainer.innerHTML = '';
    
    if (userTeams.length === 0) {
        teamListContainer.innerHTML = `
            <div class="text-center py-4 text-sm text-gray-500">
                您还没有加入任何团队
            </div>
        `;
        return;
    }
    
    // 显示用户加入的团队
    userTeams.forEach(teamId => {
        const team = teams.find(t => t.id === teamId);
        if (!team) return;
        
        const teamElement = document.createElement('div');
        teamElement.className = 'team-card p-3 border border-gray-200 rounded-md mb-2';
        teamElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-medium">${team.name}</h4>
                    <p class="text-sm text-gray-600">${team.description || '暂无描述'}</p>
                    <p class="text-xs text-gray-500 mt-1">创建者: ${team.creator} • 成员: ${team.members.length}</p>
                </div>
                <button class="view-team-btn px-3 py-1 bg-black text-white text-sm rounded-md" 
                    data-team-id="${team.id}">
                    查看
                </button>
            </div>
            <div class="flex flex-wrap mt-2">
                ${team.members.slice(0, 5).map(member => `
                    <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs mr-1 mb-1">
                        ${member.charAt(0)}
                    </div>
                `).join('')}
                ${team.members.length > 5 ? `
                    <div class="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs mr-1 mb-1">
                        +${team.members.length - 5}
                    </div>
                ` : ''}
            </div>
        `;
        
        teamListContainer.appendChild(teamElement);
        
        // 绑定查看按钮事件
        teamElement.querySelector('.view-team-btn').addEventListener('click', function() {
            viewTeam(team.id);
        });
    });
    
    // 添加"加入团队"按钮
    const joinButton = document.createElement('button');
    joinButton.id = 'join-team-btn';
    joinButton.className = 'w-full mt-2 px-4 py-2 border border-gray-300 rounded-md text-sm flex items-center justify-center';
    joinButton.innerHTML = '<i class="fas fa-plus mr-2"></i> 加入团队';
    teamListContainer.appendChild(joinButton);
    
    // 绑定加入团队按钮事件
    joinButton.addEventListener('click', showJoinTeamModal);
}

/**
 * 查看团队详情
 * @param {String} teamId 团队ID
 */
function viewTeam(teamId) {
    const teams = JSON.parse(localStorage.getItem('teams')) || [];
    const team = teams.find(t => t.id === teamId);
    
    if (!team) {
        alert('团队不存在');
        return;
    }
    
    // 创建团队详情模态框
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-lg font-semibold">${team.name}</h3>
                <button class="text-gray-500 hover:text-gray-700 close-modal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="space-y-4">
                <div>
                    <p class="text-sm text-gray-600">${team.description || '暂无描述'}</p>
                    <p class="text-xs text-gray-500 mt-2">创建于: ${new Date(team.createdAt).toLocaleDateString()} • 成员: ${team.members.length}</p>
                </div>
                
                <div class="border-t pt-3">
                    <h4 class="font-medium mb-2">团队成员</h4>
                    <div class="flex flex-wrap gap-2">
                        ${team.members.map(member => `
                            <div class="flex items-center px-2 py-1 bg-gray-100 rounded-full text-sm">
                                <div class="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center text-xs mr-1">
                                    ${member.charAt(0)}
                                </div>
                                <span>${member}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="border-t pt-3">
                    <h4 class="font-medium mb-2">团队备忘录</h4>
                    <div id="team-memos" class="space-y-3">
                        ${team.memos.length === 0 ? `
                            <p class="text-sm text-gray-500 text-center py-4">暂无备忘录</p>
                        ` : team.memos.map(memo => `
                            <div class="p-3 border border-gray-200 rounded-md">
                                <div class="flex items-center mb-1">
                                    <div class="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center text-xs mr-2">
                                        ${memo.author.charAt(0)}
                                    </div>
                                    <span class="text-sm font-medium">${memo.author}</span>
                                    <span class="text-xs text-gray-500 ml-2">${new Date(memo.timestamp).toLocaleDateString()}</span>
                                </div>
                                <p class="text-sm">${memo.content}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="border-t pt-3">
                    <button id="post-team-memo-btn" class="w-full px-4 py-2 bg-black text-white rounded-md text-sm">
                        <i class="fas fa-plus mr-2"></i> 发布团队备忘录
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭按钮事件
    modal.querySelector('.close-modal').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // 绑定发布备忘录按钮事件
    modal.querySelector('#post-team-memo-btn')?.addEventListener('click', function() {
        postTeamMemo(teamId);
        document.body.removeChild(modal);
    });
}

/**
 * 发布团队备忘录
 * @param {String} teamId 团队ID
 */
function postTeamMemo(teamId) {
    const content = prompt('请输入团队备忘录内容:');
    if (!content) return;
    
    // 获取当前用户信息
    const currentUser = localStorage.getItem('userEmail')?.split('@')[0] || '匿名用户';
    
    // 创建备忘录对象
    const newMemo = {
        id: 'memo-' + Date.now(),
        author: currentUser,
        content: content,
        timestamp: new Date().toISOString()
    };
    
    // 更新团队数据
    const teams = JSON.parse(localStorage.getItem('teams')) || [];
    const teamIndex = teams.findIndex(t => t.id === teamId);
    
    if (teamIndex !== -1) {
        teams[teamIndex].memos.unshift(newMemo);
        localStorage.setItem('teams', JSON.stringify(teams));
        
        // 显示成功消息
        showNotification('团队备忘录发布成功！');
        
        // 重新加载团队列表
        loadTeamList();
    } else {
        alert('团队不存在');
    }
}

/**
 * 显示通知
 * @param {String} message 通知内容
 */
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-black text-white px-4 py-2 rounded-md shadow-lg flex items-center';
    notification.innerHTML = `
        <i class="fas fa-info-circle mr-2"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // 3秒后自动消失
    setTimeout(() => {
        notification.classList.add('opacity-0', 'transition-opacity', 'duration-300');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// 导出函数供其他模块使用
window.initTeamSystem = initTeamSystem;
window.loadTeamList = loadTeamList;
