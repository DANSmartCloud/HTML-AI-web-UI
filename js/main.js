//main.js created by 禾云信创
// 初始化工具类
window.utils = {
    // 本地存储操作
    storage: {
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(value) : defaultValue;
            } catch (error) {
                console.error('读取存储失败:', error);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (error) {
                console.error('写入存储失败:', error);
                return false;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('删除存储失败:', error);
                return false;
            }
        }
    },

    // 格式化时间戳
    formatDate(timestamp) {
        return new Date(timestamp).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    // 复制文本到剪贴板
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (error) {
            console.error('复制到剪贴板失败:', error);
            return false;
        }
    },

    // 下载文件
    downloadFile(filename, content, type = 'text/plain') {
        try {
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            return true;
        } catch (error) {
            console.error('下载文件失败:', error);
            return false;
        }
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func(...args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
};

// 等待所有依赖加载完成
window.addEventListener('DOMContentLoaded', async () => {
    try {
        // 初始化UI实例
        if (!window.ui) {
            window.ui = new UI();
        }

        // 初始化Chat实例
        if (!window.chat) {
            window.chat = new Chat();
        }

        // 检查API版本
        const version = await window.ollamaAPI.getVersion();
        console.log('Ollama API版本:', version);

        // 加载可用模型
        const models = await window.ollamaAPI.listModels();
        console.log('可用模型:', models);

        // 初始化设置
        initializeSettings();

        // 添加全局错误处理
        window.addEventListener('unhandledrejection', (event) => {
            console.error('未处理的Promise错误:', event.reason);
            if (window.ui?.showError) {
                window.ui.showError('发生错误: ' + event.reason.message);
            }
        });

        // 添加快捷键
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

    } catch (error) {
        console.error('初始化失败:', error);
        if (window.ui?.showError) {
            window.ui.showError('初始化失败: ' + error.message);
        }
    }
});

// 初始化设置
function initializeSettings() {
    // 确保工具类和UI实例都已初始化
    if (!window.utils?.storage || !window.ui) {
        console.error('工具类或UI实例未初始化');
        return;
    }

    try {
        // 从本地存储加载设置
        const settings = window.utils.storage.get('settings', {
            temperature: 0.7,
            maxContext: 4096
        });

        // 应用设置
        if (window.ui.elements) {
            const { elements } = window.ui;
            
            // 应用温度设置
            if (elements.temperatureInput && elements.temperatureValue) {
                elements.temperatureInput.value = settings.temperature;
                elements.temperatureValue.textContent = settings.temperature;
            }

            // 应用上下文长度设置
            if (elements.maxContextInput) {
                elements.maxContextInput.value = settings.maxContext;
            }
        }

        // 保存设置
        window.utils.storage.set('settings', settings);

    } catch (error) {
        console.error('初始化设置失败:', error);
        if (window.ui?.showError) {
            window.ui.showError('初始化设置失败: ' + error.message);
        }
    }
} 