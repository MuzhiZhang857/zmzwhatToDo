
// self_improvement_assistant/frontend/js/achievement.js
/**
 * 成就系统模块
 * 负责管理用户成就、徽章和分享功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化成就系统
    initAchievementSystem();
    
    // 绑定事件监听器
    bindAchievementEvents();
});

/**
 * 成就定义数据
 * 每个成就包含id、标题、描述、图标、解锁条件和奖励
 */
const achievements = [
    {
        id: 'beginner',
        title: '起步者',
        description: '开始你的自我提升之旅',
        icon: 'fas fa-hiking',
        color: 'from-yellow-400 to-yellow-600',
        condition: () => true, // 新用户自动解锁
        reward: '解锁基础技能评估功能'
    },
    {
        id: 'learner',
        title: '学习者',
        description: '完成第一次技能评估',
        icon: 'fas fa-book-reader',
        color: 'from-purple-400 to-purple-600',
        condition: (userData) => hasCompletedFirstAssessment(userData),
        reward: '解锁详细学习路径建议'
    },
    {
        id: 'consistent',
        title: '坚持者',
        description: '连续7天更新学习进度',
        icon: 'fas fa-calendar-check',
        color: 'from-blue-400 to-blue-600',
        condition: (userData) => hasConsistentLearning(userData, 7),
        reward: '解锁进阶学习资源'
    },
    {
        id: 'master',
        title: '精通者',
        description: '至少一项技能达到精通级别',
        icon: 'fas fa-crown',
        color: 'from-yellow-500 to-red-500',
        condition: (userData) => hasMasteredSkill(userData),
        reward: '解锁导师匹配功能'
    },
    {
        id: 'connector',
        title: '连接者',
        description: '分享你的成长路径',
        icon: 'fas fa-share-alt',
        color: 'from-green-400 to-green-600',
        condition: (userData) => hasSharedProgress(userData),
        reward: '解锁社区讨论功能'
    },
    {
        id: 'planner',
        title: '规划者',
        description: '创建并完成一个月度学习计划',
        icon: 'fas fa-tasks',
        color: 'from-indigo-400 to-indigo-600',
        condition: (userData) => hasCompletedMonthlyPlan(userData),
        reward: '解锁高级规划工具'
    }
];

/**
 * 初始化成就系统
 */
function initAchievementSystem() {
    // 从本地存储加载用户成就数据
    if (!localStorage.getItem('userAchievements')) {
        // 初始化成就数据
        const initialAchievements = {
            unlocked: ['beginner'], // 默认解锁"起步者"成就
            lastChecked: new Date().toISOString(),
            shareCount: 0,
            streakDays: 0,
            lastUpdate: new Date().toISOString().split('T')[0]
        };
        localStorage.setItem('userAchievements', JSON.stringify(initialAchievements));
    }
    
    // 更新成就显示
    updateAchievementDisplay();
    
    // 检查新成就
    checkForNewAchievements();
}

/**
 * 更新成就显示
 */
function updateAchievementDisplay() {
    const badgeContainer = document.querySelector('.achievement-badge').parentElement;
    if (!badgeContainer) return;
    
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    if (!userAchievements) return;
    
    // 清空现有徽章
    badgeContainer.innerHTML = '';
    
    // 遍历前3个成就（显示在界面上）
    for (let i = 0; i < 3; i++) {
        const achievement = achievements[i];
        const isUnlocked = userAchievements.unlocked.includes(achievement.id);
        
        const badgeHTML = `
            <div class="achievement-badge bg-gradient-to-br ${isUnlocked ? achievement.color : 'from-gray-600 to-gray-700'} 
                p-3 rounded-lg text-center ${isUnlocked && achievement.id === 'learner' ? 'pulse' : ''} ${!isUnlocked ? 'opacity-50' : ''}">
                <i class="${isUnlocked ? achievement.icon : 'fas fa-question'} text-2xl"></i>
                <p class="text-xs mt-1">${isUnlocked ? achievement.title : '待解锁'}</p>
            </div>
        `;
        
        badgeContainer.innerHTML += badgeHTML;
    }
    
    // 绑定徽章点击事件
    const badges = document.querySelectorAll('.achievement-badge');
    badges.forEach(badge => {
        badge.addEventListener('click', function() {
            showAchievementDetails(this);
        });
    });
}

/**
 * 显示成就详情
 * @param {HTMLElement} badgeElement 徽章元素
 */
function showAchievementDetails(badgeElement) {
    const title = badgeElement.querySelector('p').textContent;
    const isLocked = title === '待解锁';
    
    if (isLocked) {
        showNotification('继续你的学习之旅解锁更多成就！');
        return;
    }
    
    // 查找成就详情
    const achievement = achievements.find(a => a.title === title);
    if (!achievement) return;
    
    // 创建并显示成就详情弹窗
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
    modal.innerHTML = `
        <div class="glass-card p-6 max-w-md mx-auto">
            <div class="flex items-center mb-4">
                <div class="w-12 h-12 rounded-full bg-gradient-to-br ${achievement.color} flex items-center justify-center mr-4">
                    <i class="${achievement.icon} text-xl"></i>
                </div>
                <div>
                    <h3 class="text-xl font-bold">${achievement.title}</h3>
                    <p class="text-gray-300">${achievement.description}</p>
                </div>
            </div>
            <p class="text-sm mb-4">🎁 奖励: ${achievement.reward}</p>
            <div class="flex justify-between">
                <button id="closeModal" class="bg-gray-700 px-4 py-2 rounded-md text-sm">关闭</button>
                <button id="shareAchievement" class="tech-btn px-4 py-2 rounded-md text-sm flex items-center">
                    <i class="fas fa-share-alt mr-2"></i> 分享成就
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 绑定关闭按钮事件
    document.getElementById('closeModal').addEventListener('click', function() {
        document.body.removeChild(modal);
    });
    
    // 绑定分享按钮事件
    document.getElementById('shareAchievement').addEventListener('click', function() {
        shareAchievement(achievement);
        document.body.removeChild(modal);
    });
}

/**
 * 分享成就
 * @param {Object} achievement 成就对象
 */
function shareAchievement(achievement) {
    // 更新分享次数
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    userAchievements.shareCount++;
    localStorage.setItem('userAchievements', JSON.stringify(userAchievements));
    
    // 检查是否解锁"连接者"成就
    checkForNewAchievements();
    
    // 模拟分享功能
    const shareText = `我在"自我提升助手"解锁了"${achievement.title}"成就！${achievement.description} #自我提升 #成长`;
    
    // 创建临时输入框复制内容
    const input = document.createElement('textarea');
    input.value = shareText;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    
    // 显示通知
    showNotification('成就分享内容已复制到剪贴板！');
}

/**
 * 检查新成就
 */
function checkForNewAchievements() {
    const userData = JSON.parse(localStorage.getItem('userSkills'));
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    
    if (!userData || !userAchievements) return;
    
    // 检查每个成就的解锁条件
    achievements.forEach(achievement => {
        // 如果已解锁则跳过
        if (userAchievements.unlocked.includes(achievement.id)) return;
        
        // 检查条件是否满足
        if (achievement.condition(userData)) {
            // 解锁新成就
            unlockAchievement(achievement);
        }
    });
}

/**
 * 解锁新成就
 * @param {Object} achievement 成就对象
 */
function unlockAchievement(achievement) {
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    
    // 添加到已解锁列表
    userAchievements.unlocked.push(achievement.id);
    localStorage.setItem('userAchievements', JSON.stringify(userAchievements));
    
    // 更新显示
    updateAchievementDisplay();
    
    // 显示解锁通知
    showAchievementUnlocked(achievement);
}

/**
 * 显示成就解锁通知
 * @param {Object} achievement 成就对象
 */
function showAchievementUnlocked(achievement) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="flex items-center">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br ${achievement.color} flex items-center justify-center mr-3">
                <i class="${achievement.icon}"></i>
            </div>
            <div>
                <div class="font-bold">🎉 成就解锁</div>
                <div>${achievement.title}</div>
            </div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 一段时间后隐藏通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

/**
 * 显示通知
 * @param {String} message 通知内容
 */
function showNotification(message) {
    // 创建通知元素
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.innerHTML = `
        <div class="flex items-center">
            <i class="fas fa-info-circle mr-2"></i>
            <div>${message}</div>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);
    
    // 一段时间后隐藏通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

/**
 * 绑定成就系统相关事件
 */
function bindAchievementEvents() {
    // 技能更新时检查成就
    document.addEventListener('skillUpdated', function() {
        updateLearningStreak();
        checkForNewAchievements();
    });
    
    // 任务完成时检查成就
    document.addEventListener('taskCompleted', function() {
        checkForNewAchievements();
    });
}

/**
 * 更新学习连续天数
 */
function updateLearningStreak() {
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    const today = new Date().toISOString().split('T')[0];
    
    if (userAchievements.lastUpdate === today) return;
    
    // 检查是否是连续的第二天
    const lastDate = new Date(userAchievements.lastUpdate);
    const todayDate = new Date(today);
    const diffTime = Math.abs(todayDate - lastDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
        // 连续学习天数+1
        userAchievements.streakDays++;
    } else if (diffDays > 1) {
        // 中断连续，重置为1
        userAchievements.streakDays = 1;
    }
    
    userAchievements.lastUpdate = today;
    localStorage.setItem('userAchievements', JSON.stringify(userAchievements));
}

/**
 * 检查是否完成第一次技能评估
 * @param {Object} userData 用户数据
 * @returns {Boolean}
 */
function hasCompletedFirstAssessment(userData) {
    return localStorage.getItem('assessmentCompleted') === 'true';
}

/**
 * 检查是否有连续学习记录
 * @param {Object} userData 用户数据
 * @param {Number} days 天数
 * @returns {Boolean}
 */
function hasConsistentLearning(userData, days) {
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    return userAchievements.streakDays >= days;
}

/**
 * 检查是否有精通级别的技能
 * @param {Object} userData 用户数据
 * @returns {Boolean}
 */
function hasMasteredSkill(userData) {
    for (const skill in userData.skills) {
        if (userData.skills[skill].progress >= 90) {
            return true;
        }
    }
    return false;
}

/**
 * 检查是否分享过进度
 * @param {Object} userData 用户数据
 * @returns {Boolean}
 */
function hasSharedProgress(userData) {
    const userAchievements = JSON.parse(localStorage.getItem('userAchievements'));
    return userAchievements.shareCount > 0;
}

/**
 * 检查是否完成月度学习计划
 * @param {Object} userData 用户数据
 * @returns {Boolean}
 */
function hasCompletedMonthlyPlan(userData) {
    // 检查是否至少完成了两个目标
    let completedGoals = 0;
    userData.goals.forEach(goal => {
        if (goal.completed) completedGoals++;
    });
    return completedGoals >= 2;
}

// 导出函数供其他模块使用
window.checkAchievements = checkForNewAchievements;
window.unlockAchievement = function(achievementId) {
    const achievement = achievements.find(a => a.id === achievementId);
    if (achievement) {
        unlockAchievement(achievement);
    }
};
