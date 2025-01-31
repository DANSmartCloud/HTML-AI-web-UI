// 工具类
window.utils = {
    // 本地存储操作
    storage: {
        get(key, defaultValue = null) {
            try {
                const value = localStorage.getItem(key);
                if (!value) return defaultValue;
                // 特殊处理apiUrl
                if (key === 'apiUrl') return value;
                return JSON.parse(value);
            } catch (error) {
                console.error('读取存储失败:', error);
                return defaultValue;
            }
        },
        
        set(key, value) {
            try {
                // 特殊处理apiUrl
                if (key === 'apiUrl') {
                    localStorage.setItem(key, value);
                } else {
                    localStorage.setItem(key, JSON.stringify(value));
                }
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

    // 日期格式化
    formatDate(date) {
        if (!(date instanceof Date)) {
            date = new Date(date);
        }
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    },

    // 文件大小格式化
    formatFileSize(bytes) {
        if (!bytes || isNaN(bytes)) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(2)} ${units[unitIndex]}`;
    },

    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
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
    },

    // 安全的JSON解析
    safeJSONParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch (error) {
            console.error('JSON解析失败:', error);
            return defaultValue;
        }
    },

    // 转义HTML字符
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
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

    // DOM操作辅助函数
    dom: {
        // 创建元素
        createElement(tag, attributes = {}, children = []) {
            const element = document.createElement(tag);
            
            // 设置属性
            Object.entries(attributes).forEach(([key, value]) => {
                if (key === 'className') {
                    element.className = value;
                } else if (key === 'style' && typeof value === 'object') {
                    Object.assign(element.style, value);
                } else if (key.startsWith('on') && typeof value === 'function') {
                    element.addEventListener(key.slice(2).toLowerCase(), value);
                } else {
                    element.setAttribute(key, value);
                }
            });

            // 添加子元素
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });

            return element;
        },

        // 移除元素
        removeElement(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
                return true;
            }
            return false;
        },

        // 显示/隐藏元素
        toggleElement(element, show) {
            if (element) {
                element.style.display = show ? '' : 'none';
            }
        }
    },

    cookies: {
        set(name, value, days) {
            const expires = new Date();
            expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
            document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/`;
        },
        
        get(name) {
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) === ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        },
        
        delete(name) {
            document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:01 GMT;path=/';
        }
    }
}; 