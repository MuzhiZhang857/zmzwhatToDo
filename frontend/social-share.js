
// self_improvement_assistant/frontend/social-share.js
/**
 * 社交媒体分享模块
 * 负责处理备忘录的社交平台分享功能
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化社交分享按钮
    initSocialShare();
});

/**
 * 初始化社交分享功能
 */
function initSocialShare() {
    // 绑定社交分享按钮事件
    document.addEventListener('click', function(e) {
        if (e.target.closest('[data-share-platform]')) {
            const platform = e.target.closest('[data-share-platform]').dataset.sharePlatform;
            const memoId = e.target.closest('[data-share-platform]').dataset.memoId;
            shareMemo(platform, memoId);
        }
    });
}

/**
 * 分享备忘录到社交平台
 * @param {String} platform 平台名称
 * @param {String} memoId 备忘录ID
 */
function shareMemo(platform, memoId) {
    // 获取备忘录数据
    const memos = JSON.parse(localStorage.getItem('memos')) || [];
    const memo = memos.find(m => m.id === memoId);
    
    if (!memo) return;

    // 构建分享内容
    const shareText = `我在校园备忘录分享了一条动态: "${memo.content.substring(0, 50)}..."`;
    const shareUrl = window.location.href.split('#')[0] + `?memo=${memoId}`;
    
    // 根据不同平台处理分享
    switch (platform) {
        case 'wechat':
            shareToWeChat(shareText, shareUrl);
            break;
        case 'bilibili':
            shareToBilibili(shareText, shareUrl);
            break;
        case 'github':
            shareToGitHub(shareText, shareUrl);
            break;
        case 'douyin':
            shareToDouYin(shareText, shareUrl);
            break;
        case 'xiaohongshu':
            shareToXiaoHongShu(shareText, shareUrl);
            break;
        default:
            copyToClipboard(`${shareText} ${shareUrl}`);
            showNotification('分享内容已复制到剪贴板！');
    }
}

/**
 * 分享到微信
 * @param {String} text 分享文本
 * @param {String} url 分享链接
 */
function shareToWeChat(text, url) {
    // 模拟微信分享
    copyToClipboard(`${text} ${url}`);
    showNotification('微信分享内容已复制到剪贴板，请粘贴到微信中分享');
}

/**
 * 分享到B站
 * @param {String} text 分享文本
 * @param {String} url 分享链接
 */
function shareToBilibili(text, url) {
    // 模拟B站分享
    copyToClipboard(`${text} ${url}`);
    showNotification('B站分享内容已复制到剪贴板，请粘贴到B站中分享');
}

/**
 * 分享到GitHub
 * @param {String} text 分享文本
 * @param {String} url 分享链接
 */
function shareToGitHub(text, url) {
    // 模拟GitHub分享
    copyToClipboard(`${text} ${url}`);
    showNotification('GitHub分享内容已复制到剪贴板，请粘贴到GitHub中分享');
}

/**
 * 分享到抖音
 * @param {String} text 分享文本
 * @param {String} url 分享链接
 */
function shareToDouYin(text, url) {
    // 模拟抖音分享
    copyToClipboard(`${text} ${url}`);
    showNotification('抖音分享内容已复制到剪贴板，请粘贴到抖音中分享');
}

/**
 * 分享到小红书
 * @param {String} text 分享文本
 * @param {String} url 分享链接
 */
function shareToXiaoHongShu(text, url) {
    // 模拟小红书分享
    copyToClipboard(`${text} ${url}`);
    showNotification('小红书分享内容已复制到剪贴板，请粘贴到小红书分享');
}

/**
 * 复制文本到剪贴板
 * @param {String} text 要复制的文本
 */
function copyToClipboard(text) {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
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
window.shareMemo = shareMemo;
