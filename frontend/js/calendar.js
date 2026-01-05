
// self_improvement_assistant/frontend/js/calendar.js
/**
 * 日历热力图模块
 * 基于备忘录数据生成热力图显示
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化日历热力图
    initCalendarHeatmap();
});

/**
 * 初始化日历热力图
 */
function initCalendarHeatmap() {
    // 获取日历容器
    const calendarContainer = document.getElementById('calendar-container');
    if (!calendarContainer) return;

    // 获取备忘录数据
    const memos = JSON.parse(localStorage.getItem('memos')) || [];
    
    // 计算每日备忘录数量
    const memoCountByDate = countMemosByDate(memos);
    
    // 生成日历热力图
    renderCalendarHeatmap(calendarContainer, memoCountByDate);
}

/**
 * 按日期统计备忘录数量
 * @param {Array} memos 备忘录数组
 * @returns {Object} 日期为键，数量为值的对象
 */
function countMemosByDate(memos) {
    const countByDate = {};
    
    memos.forEach(memo => {
        const date = new Date(memo.timestamp);
        const dateStr = date.toISOString().split('T')[0];
        
        if (!countByDate[dateStr]) {
            countByDate[dateStr] = 0;
        }
        countByDate[dateStr]++;
    });
    
    return countByDate;
}

/**
 * 渲染日历热力图
 * @param {HTMLElement} container 日历容器
 * @param {Object} memoCountByDate 每日备忘录数量统计
 */
function renderCalendarHeatmap(container, memoCountByDate) {
    // 清空容器
    container.innerHTML = '';
    
    // 创建日历标题
    const title = document.createElement('h4');
    title.className = 'text-sm font-semibold mb-2';
    title.textContent = '活动日历';
    container.appendChild(title);
    
    // 创建日历网格容器
    const grid = document.createElement('div');
    grid.className = 'calendar-grid grid grid-cols-7 gap-1';
    container.appendChild(grid);
    
    // 获取当前日期
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    
    // 获取当月第一天
    const firstDay = new Date(currentYear, currentMonth, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0-6 (0是周日)
    
    // 获取当月天数
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    
    // 获取上个月天数
    const daysInLastMonth = new Date(currentYear, currentMonth, 0).getDate();
    
    // 添加空白单元格（上个月的最后几天）
    for (let i = 0; i < firstDayOfWeek; i++) {
        const cell = createDayCell('empty', '');
        grid.appendChild(cell);
    }
    
    // 添加当月日期单元格
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateStr = date.toISOString().split('T')[0];
        const count = memoCountByDate[dateStr] || 0;
        
        // 确定颜色等级
        let colorClass;
        if (count === 0) {
            colorClass = 'color-0';
        } else if (count <= 2) {
            colorClass = 'color-1';
        } else if (count <= 4) {
            colorClass = 'color-2';
        } else if (count <= 6) {
            colorClass = 'color-3';
        } else {
            colorClass = 'color-4';
        }
        
        const cell = createDayCell(colorClass, day, count);
        grid.appendChild(cell);
    }
    
    // 计算总单元格数
    const totalCells = firstDayOfWeek + daysInMonth;
    const remainingCells = 42 - totalCells; // 6行x7列=42单元格
    
    // 添加空白单元格（下个月的前几天）
    for (let i = 0; i < remainingCells; i++) {
        const cell = createDayCell('empty', '');
        grid.appendChild(cell);
    }
    
    // 添加图例
    const legend = document.createElement('div');
    legend.className = 'flex justify-between mt-2 text-xs text-gray-500';
    legend.innerHTML = `
        <span>少</span>
        <div class="flex space-x-1">
            <div class="w-3 h-3 rounded-sm color-1"></div>
            <div class="w-3 h-3 rounded-sm color-2"></div>
            <div class="w-3 h-3 rounded-sm color-3"></div>
            <div class="w-3 h-3 rounded-sm color-4"></div>
        </div>
        <span>多</span>
    `;
    container.appendChild(legend);
}

/**
 * 创建日期单元格
 * @param {String} colorClass 颜色类名
 * @param {Number|String} day 日期
 * @param {Number} count 备忘录数量
 * @returns {HTMLElement} 日期单元格元素
 */
function createDayCell(colorClass, day, count = 0) {
    const cell = document.createElement('div');
    cell.className = `day-cell ${colorClass} flex items-center justify-center text-xs rounded-sm`;
    
    if (colorClass !== 'empty') {
        cell.title = `${day}日: ${count}条备忘录`;
        cell.innerHTML = day;
        
        // 添加悬停效果
        cell.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.1)';
            this.style.zIndex = '10';
            this.style.boxShadow = '0 0 5px rgba(0,0,0,0.2)';
        });
        
        cell.addEventListener('mouseleave', function() {
            this.style.transform = '';
            this.style.zIndex = '';
            this.style.boxShadow = '';
        });
    }
    
    return cell;
}

// 导出函数供其他模块使用
window.initCalendarHeatmap = initCalendarHeatmap;
