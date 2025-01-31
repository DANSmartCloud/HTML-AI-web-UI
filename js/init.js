// 初始化应用
(async function() {
    // 确保工具类已初始化
    if (!window.utils) {
        console.error('工具类未初始化');
        return;
    }

    try {
        // 初始化API实例
        window.ollamaAPI = new OllamaAPI();

        // 初始化Markdown渲染器
        window.markdownRenderer = new MarkdownRenderer();
        await window.markdownRenderer.initialize();

        // 等待DOM加载完成
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', initializeApp);
        } else {
            await initializeApp();
        }
    } catch (error) {
        console.error('应用初始化失败:', error);
        showError('应用初始化失败: ' + error.message);
    }
})();

// 初始化应用
async function initializeApp() {
    try {
        // 初始化UI实例
        window.ui = new UI();
        await window.ui.init();

        // 初始化Chat实例
        window.chat = new Chat();
        await window.chat.init();

        // 检查API版本
        const version = await window.ollamaAPI.getVersion();
        console.log('Ollama API版本:', version);

        // 加载可用模型
        const models = await window.ollamaAPI.listModels();
        console.log('可用模型:', models);

        // 初始化设置
        initializeSettings();

        // 添加全局错误处理
        setupErrorHandling();

        // 添加快捷键
        setupShortcuts();

        // 设置自动保存
        setupAutoSave();

    } catch (error) {
        console.error('应用初始化失败:', error);
        showError('应用初始化失败: ' + error.message);
    }
}

// 初始化设置
function initializeSettings() {
    try {
        // 从本地存储加载设置
        const settings = window.utils.storage.get('settings', {
            temperature: 0.7,
            maxContext: 4096
        });

        // 应用设置
        if (window.ui?.elements) {
            const { elements } = window.ui;
            
            if (elements.temperatureInput && elements.temperatureValue) {
                elements.temperatureInput.value = settings.temperature;
                elements.temperatureValue.textContent = settings.temperature;
            }

            if (elements.maxContextInput) {
                elements.maxContextInput.value = settings.maxContext;
            }
        }

        // 保存设置
        window.utils.storage.set('settings', settings);

    } catch (error) {
        console.error('初始化设置失败:', error);
        showError('初始化设置失败: ' + error.message);
    }
}

// 设置错误处理
function setupErrorHandling() {
    window.addEventListener('unhandledrejection', (event) => {
        console.error('未处理的Promise错误:', event.reason);
        showError('发生错误: ' + event.reason.message);
    });

    window.addEventListener('error', (event) => {
        console.error('全局错误:', event.error);
        showError('发生错误: ' + event.error.message);
    });
}

// 设置快捷键
function setupShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + / 打开设置
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            if (window.ui?.elements?.settingsModal) {
                window.ui.showModal(window.ui.elements.settingsModal);
            }
        }
        
        // Esc 关闭所有模态框
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                if (window.ui?.hideModal) {
                    window.ui.hideModal(modal);
                }
            });
        }
    });
}

// 设置自动保存
function setupAutoSave() {
    // 自动保存聊天记录
    setInterval(() => {
        if (window.chat?.messages?.length > 0) {
            window.chat.saveChats();
        }
    }, 60000); // 每分钟保存一次

    // 添加窗口关闭前保存
    window.addEventListener('beforeunload', (e) => {
        if (window.chat?.messages?.length > 0) {
            e.preventDefault();
            e.returnValue = '';
            window.chat.saveChats();
        }
    });
}

// 显示错误信息
function showError(message) {
    if (window.ui?.showError) {
        window.ui.showError(message);
    } else {
        console.error(message);
        alert(message);
    }
} 