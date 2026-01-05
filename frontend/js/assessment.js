
/* self_improvement_assistant/frontend/js/assessment.js */
/**
 * 技能评估模块
 * 负责生成评估测试、评分以及更新用户技能水平
 */

document.addEventListener('DOMContentLoaded', function() {
    // 初始化评估系统
    initAssessmentSystem();
    
    // 绑定开始评估按钮事件
    if (document.getElementById('startAssessment')) {
        document.getElementById('startAssessment').addEventListener('click', startAssessment);
    }
});

/**
 * 技能评估题库
 * 按技能分类的问题集合
 */
const assessmentQuestions = {
    '沟通能力': [
        {
            id: 'comm1',
            question: '在团队讨论中，当你的观点与他人不同时，你通常会怎么做？',
            options: [
                { text: '强烈坚持自己的观点，直到说服他人', value: 2 },
                { text: '先倾听他人的观点，然后清晰表达自己的想法，寻找共同点', value: 5 },
                { text: '通常会避免冲突，倾向于接受团队大多数人的意见', value: 3 },
                { text: '提出折中的解决方案，平衡不同的观点', value: 4 }
            ],
            type: 'single',
            skillWeight: 0.4
        },
        {
            id: 'comm2',
            question: '在准备一个重要演讲时，你会如何准备？',
            options: [
                { text: '编写完整的演讲稿并逐字背诵', value: 3 },
                { text: '准备关键点和框架，然后根据现场反应灵活调整', value: 5 },
                { text: '主要依靠幻灯片，边看边讲', value: 2 },
                { text: '即兴发挥，相信自己的临场表现', value: 1 }
            ],
            type: 'single',
            skillWeight: 0.3
        },
        {
            id: 'comm3',
            question: '以下哪些是有效书面沟通的关键要素？（多选）',
            options: [
                { text: '清晰简洁的语言', value: 1 },
                { text: '层次分明的结构', value: 1 },
                { text: '使用专业术语越多越好', value: -1 },
                { text: '了解目标读者的需求和背景', value: 1 },
                { text: '精确的语法和标点', value: 1 }
            ],
            type: 'multiple',
            skillWeight: 0.3
        }
    ],
    '技术能力': [
        {
            id: 'tech1',
            question: '当你需要学习一项新技术时，你通常会采取什么策略？',
            options: [
                { text: '通过实践项目边做边学', value: 5 },
                { text: '系统学习官方文档和教程', value: 4 },
                { text: '观看视频教程后模仿练习', value: 3 },
                { text: '参加相关培训课程', value: 3 }
            ],
            type: 'single',
            skillWeight: 0.3
        },
        {
            id: 'tech2',
            question: '当你的项目中遇到技术难题时，你会如何解决？',
            options: [
                { text: '立即寻求他人帮助', value: 2 },
                { text: '尝试自己解决，需要时查阅文档和搜索解决方案', value: 5 },
                { text: '绕过问题，找其他方法实现', value: 3 },
                { text: '等待更有经验的人来解决', value: 1 }
            ],
            type: 'single',
            skillWeight: 0.4
        },
        {
            id: 'tech3',
            question: '以下哪些做法有助于提高解决问题的能力？（多选）',
            options: [
                { text: '培养系统思维，分析问题的根本原因', value: 1 },
                { text: '构建知识体系，建立技术知识间的联系', value: 1 },
                { text: '积累现成的解决方案，不需要理解原理', value: -1 },
                { text: '学习调试技巧和工具的使用', value: 1 },
                { text: '保持好奇心，不断探索技术原理', value: 1 }
            ],
            type: 'multiple',
            skillWeight: 0.3
        }
    ],
    '自我管理': [
        {
            id: 'self1',
            question: '当你有多个任务需要完成时，你通常如何安排？',
            options: [
                { text: '按截止日期先后顺序完成', value: 3 },
                { text: '按重要性和紧急程度排序，制定详细计划', value: 5 },
                { text: '先做简单的或感兴趣的任务', value: 2 },
                { text: '同时处理多个任务，根据进展灵活调整', value: 4 }
            ],
            type: 'single',
            skillWeight: 0.35
        },
        {
            id: 'self2',
            question: '当你设定一个长期目标时，你会如何确保自己能够达成？',
            options: [
                { text: '将大目标分解为小目标，定期检查进度', value: 5 },
                { text: '设定截止日期，全力冲刺完成', value: 3 },
                { text: '告诉朋友或家人，利用社交压力督促自己', value: 4 },
                { text: '依靠自己的意志力和热情', value: 2 }
            ],
            type: 'single',
            skillWeight: 0.3
        },
        {
            id: 'self3',
            question: '以下哪些是有效管理时间的方法？（多选）',
            options: [
                { text: '使用番茄工作法等时间管理技巧', value: 1 },
                { text: '建立日常惯例和流程', value: 1 },
                { text: '不断多任务处理以提高效率', value: -1 },
                { text: '定期规划和回顾', value: 1 },
                { text: '学会拒绝不重要的事务', value: 1 }
            ],
            type: 'multiple',
            skillWeight: 0.35
        }
    ]
};

/**
 * 初始化评估系统
 */
function initAssessmentSystem() {
    // 检查是否已完成评估
    if (localStorage.getItem('assessmentCompleted') === 'true') {
        updateAssessmentUI(true);
    }
}

/**
 * 开始技能评估
 */
function startAssessment() {
    // 从用户数据获取主要技能
    const userData = JSON.parse(localStorage.getItem('userSkills')) || {};
    const skills = Object.keys(userData.skills || {});
    
    // 如果用户没有技能数据，使用默认技能集
    const assessmentSkills = skills.length > 0 ? skills : ['沟通能力', '技术能力', '自我管理'];
    
    // 创建评估容器
    const assessmentContainer = document.getElementById('assessment-container');
    assessmentContainer.innerHTML = '';
    
    // 创建评估表单
    const assessmentForm = document.createElement('form');
    assessmentForm.className = 'bg-gray-800 p-6 rounded-lg';
    assessmentForm.id = 'assessment-form';
    
    // 添加标题和说明
    assessmentForm.innerHTML = `
        <h3 class="text-lg font-semibold mb-4">技能评估测试</h3>
        <p class="text-gray-400 mb-6">请认真回答以下问题，系统将基于你的答案评估技能水平</p>
        <div id="questions-container" class="space-y-8"></div>
        <div class="mt-6 flex justify-between">
            <button type="button" id="cancel-assessment" class="bg-gray-700 px-4 py-2 rounded-md text-sm">取消</button>
            <button type="submit" class="tech-btn px-6 py-2 rounded-md text-white flex items-center">
                <i class="fas fa-check-circle mr-2"></i> 提交评估
            </button>
        </div>
    `;
    
    assessmentContainer.appendChild(assessmentForm);
    
    // 绑定表单事件
    assessmentForm.addEventListener('submit', submitAssessment);
    document.getElementById('cancel-assessment').addEventListener('click', cancelAssessment);
    
    // 为每个技能生成问题
    const questionsContainer = document.getElementById('questions-container');
    let questionCount = 0;
    
    assessmentSkills.forEach(skill => {
        // 检查该技能是否有评估问题
        if (assessmentQuestions[skill]) {
            // 添加技能标题
            const skillTitle = document.createElement('div');
            skillTitle.className = 'border-t border-gray-700 pt-4 mt-6 first:border-0 first:mt-0';
            skillTitle.innerHTML = `<h4 class="font-semibold mb-3">${skill}评估</h4>`;
            questionsContainer.appendChild(skillTitle);
            
            // 添加该技能的所有问题
            assessmentQuestions[skill].forEach(q => {
                const questionElement = createQuestionElement(q, questionCount++);
                questionsContainer.appendChild(questionElement);
            });
        }
    });
    
    // 平滑滚动到评估区域
    assessmentContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * 创建问题元素
 * @param {Object} question 问题对象
 * @param {Number} index 问题索引
 * @returns {HTMLElement} 问题元素
 */
function createQuestionElement(question, index) {
    const questionElement = document.createElement('div');
    questionElement.className = 'bg-gray-900 p-4 rounded-lg';
    questionElement.dataset.id = question.id;
    questionElement.dataset.type = question.type;
    questionElement.dataset.skillWeight = question.skillWeight;
    
    // 问题文本
    const questionText = document.createElement('p');
    questionText.className = 'mb-3';
    questionText.textContent = `${index + 1}. ${question.question}`;
    questionElement.appendChild(questionText);
    
    // 选项列表
    const optionsContainer = document.createElement('div');
    optionsContainer.className = question.type === 'multiple' ? 'space-y-2' : 'space-y-2';
    
    question.options.forEach((option, optIndex) => {
        const optionElement = document.createElement('div');
        optionElement.className = 'flex items-start';
        
        const inputType = question.type === 'multiple' ? 'checkbox' : 'radio';
        const inputName = question.type === 'multiple' ? `${question.id}_${optIndex}` : question.id;
        
        optionElement.innerHTML = `
            <input type="${inputType}" id="${inputName}_${optIndex}" name="${inputName}" value="${option.value}" 
                class="mt-1 mr-2 h-4 w-4" ${question.type === 'multiple' ? '' : 'required'}>
            <label for="${inputName}_${optIndex}" class="text-sm">${option.text}</label>
        `;
        
        optionsContainer.appendChild(optionElement);
    });
    
    questionElement.appendChild(optionsContainer);
    return questionElement;
}

/**
 * 提交评估表单
 * @param {Event} e 表单提交事件
 */
function submitAssessment(e) {
    e.preventDefault();
    
    // 显示加载状态
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.innerHTML = '<i class="fas fa-circle-notch fa-spin mr-2"></i> 分析中...';
    submitButton.disabled = true;
    
    // 获取所有问题元素
    const questionElements = document.querySelectorAll('#questions-container > div[data-id]');
    
    // 准备评分结果
    const skillScores = {};
    const skillWeights = {};
    
    // 处理每个问题的答案
    questionElements.forEach(questionEl => {
        const questionId = questionEl.dataset.id;
        const questionType = questionEl.dataset.type;
        const skillWeight = parseFloat(questionEl.dataset.skillWeight);
        
        // 确定该问题属于哪个技能
        let skill = '';
        for (const s in assessmentQuestions) {
            if (assessmentQuestions[s].some(q => q.id === questionId)) {
                skill = s;
                break;
            }
        }
        
        if (!skill) return; // 如果找不到对应技能则跳过
        
        // 初始化技能分数和权重
        if (!skillScores[skill]) {
            skillScores[skill] = 0;
            skillWeights[skill] = 0;
        }
        
        // 计算该问题的得分
        let questionScore = 0;
        
        if (questionType === 'single') {
            // 单选题
            const selectedOption = questionEl.querySelector(`input[name="${questionId}"]:checked`);
            if (selectedOption) {
                questionScore = parseInt(selectedOption.value, 10);
            }
        } else if (questionType === 'multiple') {
            // 多选题
            const checkboxes = questionEl.querySelectorAll('input[type="checkbox"]:checked');
            checkboxes.forEach(checkbox => {
                questionScore += parseInt(checkbox.value, 10);
            });
        }
        
        // 累加加权分数和权重
        skillScores[skill] += questionScore * skillWeight;
        skillWeights[skill] += skillWeight;
    });
    
    // 计算每个技能的最终得分（百分比）
    const finalScores = {};
    for (const skill in skillScores) {
        // 按100分制计算最终得分，最低20分，最高100分
        const maxPossibleScore = 5 * skillWeights[skill]; // 假设每题满分5分
        const scorePercentage = (skillScores[skill] / maxPossibleScore) * 100;
        finalScores[skill] = Math.min(100, Math.max(20, Math.round(scorePercentage)));
    }
    
    // 模拟处理延迟，显示结果
    setTimeout(() => {
        // 更新用户技能数据
        updateUserSkills(finalScores);
        
        // 显示评估结果
        showAssessmentResults(finalScores);
        
        // 标记评估已完成
        localStorage.setItem('assessmentCompleted', 'true');
        
        // 触发成就检查
        if (window.checkAchievements) {
            window.checkAchievements();
        }
        
        // 解锁"学习者"成就
        if (window.unlockAchievement) {
            window.unlockAchievement('learner');
        }
        
        // 更新UI状态
        updateAssessmentUI(true);
    }, 1500);
}

/**
 * 更新用户技能数据
 * @param {Object} scores 技能得分对象
 */
function updateUserSkills(scores) {
    const userData = JSON.parse(localStorage.getItem('userSkills')) || {
        username: '探索者',
        joinDate: new Date().toISOString().split('T')[0],
        skills: {},
        goals: [],
        progress: 0
    };
    
    // 更新技能数据
    for (const skill in scores) {
        if (!userData.skills[skill]) {
            userData.skills[skill] = {
                level: 1,
                progress: 0,
                lastUpdated: new Date().toISOString().split('T')[0]
            };
        }
        
        // 将评估分数转换为进度百分比
        userData.skills[skill].progress = scores[skill];
        userData.skills[skill].lastUpdated = new Date().toISOString().split('T')[0];
        
        // 根据进度更新技能等级
        if (scores[skill] >= 90) {
            userData.skills[skill].level = 5; // 精通
        } else if (scores[skill] >= 75) {
            userData.skills[skill].level = 4; // 高级
        } else if (scores[skill] >= 60) {
            userData.skills[skill].level = 3; // 中级
        } else if (scores[skill] >= 40) {
            userData.skills[skill].level = 2; // 基础
        } else {
            userData.skills[skill].level = 1; // 入门
        }
    }
    
    // 重新计算总体进度
    const totalSkills = Object.keys(userData.skills).length;
    const totalProgress = Object.values(userData.skills).reduce((sum, skill) => sum + skill.progress, 0);
    userData.progress = Math.round(totalProgress / totalSkills);
    
    // 保存更新后的数据
    localStorage.setItem('userSkills', JSON.stringify(userData));
    
    // 如果存在更新技能进度的函数，调用它来刷新技能树
    if (window.updateSkillProgress) {
        for (const skill in scores) {
            window.updateSkillProgress(skill, scores[skill]);
        }
    }
    
    // 触发技能更新事件
    document.dispatchEvent(new CustomEvent('skillUpdated'));
}

/**
 * 显示评估结果
 * @param {Object} scores 技能得分对象
 */
function showAssessmentResults(scores) {
    const assessmentContainer = document.getElementById('assessment-container');
    
    // 创建结果显示
    const resultsElement = document.createElement('div');
    resultsElement.className = 'bg-gray-800 p-6 rounded-lg';
    
    // 添加标题和说明
    resultsElement.innerHTML = `
        <div class="text-center mb-6">
            <div class="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <i class="fas fa-chart-line text-2xl"></i>
            </div>
            <h3 class="text-lg font-semibold">评估完成！</h3>
            <p class="text-gray-400">以下是你的技能评估结果</p>
        </div>
        <div class="space-y-4" id="skill-scores"></div>
        <div class="mt-6 border-t border-gray-700 pt-4">
            <h4 class="font-semibold mb-3">提升建议</h4>
            <ul class="text-sm space-y-2 pl-5" id="skill-suggestions"></ul>
        </div>
        <button id="close-results" class="tech-btn px-6 py-2 rounded-md text-white flex items-center mx-auto mt-6">
            <i class="fas fa-check-circle mr-2"></i> 返回
        </button>
    `;
    
    assessmentContainer.innerHTML = '';
    assessmentContainer.appendChild(resultsElement);
    
    // 填充技能分数
    const skillScoresContainer = document.getElementById('skill-scores');
    for (const skill in scores) {
        const scoreElement = document.createElement('div');
        
        // 确定技能等级文本和颜色
        let levelText, levelColor;
        if (scores[skill] >= 90) {
            levelText = '精通';
            levelColor = 'from-green-400 to-green-600';
        } else if (scores[skill] >= 75) {
            levelText = '高级';
            levelColor = 'from-blue-400 to-blue-600';
        } else if (scores[skill] >= 60) {
            levelText = '中级';
            levelColor = 'from-purple-400 to-purple-600';
        } else if (scores[skill] >= 40) {
            levelText = '基础';
            levelColor = 'from-yellow-400 to-yellow-600';
        } else {
            levelText = '入门';
            levelColor = 'from-red-400 to-red-600';
        }
        
        scoreElement.innerHTML = `
            <div class="flex justify-between items-center mb-1">
                <span>${skill}</span>
                <span class="text-sm bg-gradient-to-r ${levelColor} bg-clip-text text-transparent font-semibold">${levelText}</span>
            </div>
            <div class="w-full bg-gray-700 rounded-full h-2.5">
                <div class="bg-gradient-to-r ${levelColor} h-2.5 rounded-full progress-bar" style="width: ${scores[skill]}%"></div>
            </div>
        `;
        
        skillScoresContainer.appendChild(scoreElement);
    }
    
    // 添加提升建议
    const suggestionsContainer = document.getElementById('skill-suggestions');
    
    // 基于评估结果生成建议
    for (const skill in scores) {
        let suggestion;
        
        if (scores[skill] < 40) {
            suggestion = getSuggestionForSkill(skill, 'beginner');
        } else if (scores[skill] < 60) {
            suggestion = getSuggestionForSkill(skill, 'basic');
        } else if (scores[skill] < 75) {
            suggestion = getSuggestionForSkill(skill, 'intermediate');
        } else if (scores[skill] < 90) {
            suggestion = getSuggestionForSkill(skill, 'advanced');
        } else {
            suggestion = getSuggestionForSkill(skill, 'master');
        }
        
        const li = document.createElement('li');
        li.className = 'flex items-start';
        li.innerHTML = `<span class="text-xs mr-2">📝</span><span>${suggestion}</span>`;
        suggestionsContainer.appendChild(li);
    }
    
    // 绑定关闭按钮事件
    document.getElementById('close-results').addEventListener('click', function() {
        updateAssessmentUI(true);
    });
}

/**
 * 获取技能提升建议
 * @param {String} skill 技能名称
 * @param {String} level 技能等级
 * @returns {String} 提升建议
 */
function getSuggestionForSkill(skill, level) {
    const suggestions = {
        '沟通能力': {
            'beginner': '尝试每天有意识地进行一次完整的表达，可以是向朋友解释一个概念或写一篇短文。',
            'basic': '参与小组讨论，尝试清晰表达自己的观点，同时注意倾听他人意见。',
            'intermediate': '准备一个简短的演讲或分享，关注结构和表达的清晰度。',
            'advanced': '参与更复杂的沟通场景，如辩论或谈判，注重策略性表达。',
            'master': '尝试教授他人沟通技巧，或在更高要求的场合展示你的沟通能力。'
        },
        '技术能力': {
            'beginner': '从一个简单的项目开始，专注于理解基本概念和工具使用。',
            'basic': '尝试独立完成一个小型项目，遇到问题时查阅文档和搜索解决方案。',
            'intermediate': '挑战更复杂的项目，探索不同的技术和方法，建立系统思维。',
            'advanced': '深入研究技术原理，优化解决方案，学习高级概念和最佳实践。',
            'master': '分享你的知识，指导他人，挑战创新型项目或贡献开源社区。'
        },
        '自我管理': {
            'beginner': '建立每日计划习惯，记录完成的任务和遇到的挑战。',
            'basic': '学习使用时间管理工具，如番茄工作法，提高专注力和效率。',
            'intermediate': '制定更系统的目标计划，学会分解大目标为小步骤，定期回顾进度。',
            'advanced': '优化你的工作流程，建立有效的反馈循环，提高自我调节能力。',
            'master': '探索高级自我管理策略，如深度工作和心流状态，最大化个人潜能。'
        }
    };
    
    // 如果没有特定建议，返回通用建议
    if (!suggestions[skill] || !suggestions[skill][level]) {
        return `继续练习和提升你的${skill}，寻找系统化的学习资源和实践机会。`;
    }
    
    return suggestions[skill][level];
}

/**
 * 取消评估
 */
function cancelAssessment() {
    updateAssessmentUI(false);
}

/**
 * 更新评估UI状态
 * @param {Boolean} completed 是否已完成评估
 */
function updateAssessmentUI(completed) {
    const assessmentContainer = document.getElementById('assessment-container');
    
    if (completed) {
        // 显示已完成状态
        assessmentContainer.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg text-center">
                <div class="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-3">
                    <i class="fas fa-check text-2xl"></i>
                </div>
                <h3 class="text-lg font-semibold mb-2">技能评估已完成</h3>
                <p class="text-gray-400 mb-4">你可以在技能树中看到评估结果，或重新进行评估</p>
                <div class="flex flex-wrap justify-center gap-3">
                    <button id="view-skills" class="bg-gray-700 px-4 py-2 rounded-md text-sm flex items-center">
                        <i class="fas fa-eye mr-2"></i> 查看技能树
                    </button>
                    <button id="restart-assessment" class="tech-btn px-4 py-2 rounded-md text-white flex items-center">
                        <i class="fas fa-redo mr-2"></i> 重新评估
                    </button>
                </div>
            </div>
        `;
        
        // 绑定按钮事件
        document.getElementById('view-skills').addEventListener('click', function() {
            // 滚动到技能树区域
            document.getElementById('skill-tree-container').scrollIntoView({ behavior: 'smooth' });
        });
        
        document.getElementById('restart-assessment').addEventListener('click', startAssessment);
    } else {
        // 显示初始状态
        assessmentContainer.innerHTML = `
            <div class="bg-gray-800 p-6 rounded-lg text-center">
                <img src="https://picsum.photos/seed/assessment/300/150" alt="技能评估" class="rounded-lg mx-auto mb-4">
                <h3 class="text-lg font-semibold mb-2">通过评估了解你的技能水平</h3>
                <p class="text-gray-400 mb-4">完成简短的评估测试，获取个性化的技能评分和提升建议</p>
                <button id="startAssessment" class="tech-btn px-6 py-2 rounded-md text-white flex items-center mx-auto">
                    <i class="fas fa-play mr-2"></i> 开始评估
                </button>
            </div>
        `;
        
        // 重新绑定开始按钮事件
        document.getElementById('startAssessment').addEventListener('click', startAssessment);
    }
}

// 导出函数供其他模块使用
window.startAssessment = startAssessment;
window.updateAssessmentUI = updateAssessmentUI;
