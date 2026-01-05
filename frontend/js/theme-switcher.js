
// self_improvement_assistant/frontend/js/theme-switcher.js
/**
 * 主题切换模块
 * 负责处理日夜模式切换功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题
    initTheme();
    
    // 绑定主题切换按钮事件
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
});

/**
 * 初始化主题
 */
function initTheme() {
    // 检查本地存储中的主题设置
    const savedTheme = localStorage.getItem('theme') || 'light';
    
    // 应用主题
    applyTheme(savedTheme);
    
    // 更新切换按钮图标
    updateThemeToggleIcon(savedTheme);
}

/**
 * 切换主题
 */
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    // 应用新主题
    applyTheme(newTheme);
    
    // 保存主题设置
    localStorage.setItem('theme', newTheme);
    
    // 更新切换按钮图标
    updateThemeToggleIcon(newTheme);
}

/**
 * 应用主题
 * @param {String} theme 主题名称 (light/dark)
 */
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // 触发主题变化事件
    document.dispatchEvent(new CustomEvent('themeChanged', {
        detail: { theme: theme }
    }));
}

/**
 * 更新主题切换按钮图标
 * @param {String} theme 当前主题
 */
function updateThemeToggleIcon(theme) {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) return;
    
    if (theme === 'dark') {
        themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        themeToggle.title = '切换到日间模式';
    } else {
        themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        themeToggle.title = '切换到夜间模式';
    }
}

/**
 * 获取当前主题
 * @returns {String} 当前主题 (light/dark)
 */
function getCurrentTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
}

// 导出函数供其他模块使用
window.toggleTheme = toggleTheme;
window.getCurrentTheme = getCurrentTheme;
