// 事件处理系统
class EventBus {
    constructor() {
        this.listeners = new Map();
        this.onceListeners = new Map();
    }

    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    once(event, callback) {
        if (!this.onceListeners.has(event)) {
            this.onceListeners.set(event, new Set());
        }
        this.onceListeners.get(event).add(callback);
    }

    emit(event, data) {
        // 处理普通监听器
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件处理错误 (${event}):`, error);
                }
            });
        }

        // 处理一次性监听器
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`一次性事件处理错误 (${event}):`, error);
                }
            });
            this.onceListeners.delete(event);
        }
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).delete(callback);
        }
        if (this.onceListeners.has(event)) {
            this.onceListeners.get(event).delete(callback);
        }
    }
}

// 创建全局事件总线实例
window.eventBus = new EventBus();

// 添加应用初始化事件处理
window.eventBus.once('app:initialized', () => {
    console.log('应用初始化完成');
});

// 注册核心事件处理器
document.addEventListener('DOMContentLoaded', () => {
    // 全局错误处理
    window.eventBus.on('error', (error) => {
        console.error('应用错误:', error);
        if (window.ui?.showError) {
            window.ui.showError(error.message || '发生未知错误');
        }
    });

    // 初始化完成后的处理
    window.eventBus.once('app:initialized', () => {
        // 移除加载中的状态
        document.body.classList.remove('loading');
    });
});

class Logger {
    constructor(context = '') {
        this.context = context;
        this.level = localStorage.getItem('logLevel') || 'info';
        this.levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        this.colors = {
            debug: '#808080',
            info: '#0066cc',
            warn: '#ff9900',
            error: '#cc0000'
        };

        // 初始化性能监控
        this.performanceMarks = new Map();
        this.measures = [];
    }

    setLevel(level) {
        if (this.levels.hasOwnProperty(level)) {
            this.level = level;
            localStorage.setItem('logLevel', level);
        }
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const prefix = this.context ? `[${this.context}]` : '';
        return {
            timestamp,
            level,
            message: `${prefix} ${message}`,
            args
        };
    }

    shouldLog(level) {
        return this.levels[level] >= this.levels[this.level];
    }

    log(level, message, ...args) {
        if (!this.shouldLog(level)) return;

        const logData = this.formatMessage(level, message, ...args);
        
        console.log(
            `%c${logData.timestamp} ${logData.level.toUpperCase()} ${logData.message}`,
            `color: ${this.colors[level]}`,
            ...logData.args
        );

        // 发送到事件总线
        window.eventBus?.emit('log', logData);
        
        // 存储日志
        this.storeLog(logData);
    }

    debug(message, ...args) {
        this.log('debug', message, ...args);
    }

    info(message, ...args) {
        this.log('info', message, ...args);
    }

    warn(message, ...args) {
        this.log('warn', message, ...args);
    }

    error(message, ...args) {
        this.log('error', message, ...args);
    }

    // 性能监控方法
    startTimer(label) {
        this.performanceMarks.set(label, performance.now());
    }

    endTimer(label) {
        const startTime = this.performanceMarks.get(label);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.measures.push({
                label,
                duration,
                timestamp: Date.now()
            });
            this.debug(`Performance ${label}: ${duration.toFixed(2)}ms`);
            this.performanceMarks.delete(label);
            return duration;
        }
    }

    getPerformanceMetrics() {
        const metrics = {};
        for (const measure of this.measures) {
            if (!metrics[measure.label]) {
                metrics[measure.label] = {
                    count: 0,
                    total: 0,
                    min: Infinity,
                    max: -Infinity
                };
            }
            
            const stat = metrics[measure.label];
            stat.count++;
            stat.total += measure.duration;
            stat.min = Math.min(stat.min, measure.duration);
            stat.max = Math.max(stat.max, measure.duration);
        }

        // 计算平均值
        Object.values(metrics).forEach(stat => {
            stat.avg = stat.total / stat.count;
        });

        return metrics;
    }

    // 日志存储和导出
    storeLog(logData) {
        const MAX_LOGS = 1000;
        let logs = [];
        
        try {
            const storedLogs = localStorage.getItem('applicationLogs');
            if (storedLogs) {
                logs = JSON.parse(storedLogs);
            }
        } catch (error) {
            console.error('读取存储的日志失败:', error);
        }
        
        logs.push(logData);
        
        // 保持日志数量在限制内
        if (logs.length > MAX_LOGS) {
            logs = logs.slice(-MAX_LOGS);
        }
        
        try {
            localStorage.setItem('applicationLogs', JSON.stringify(logs));
        } catch (error) {
            console.error('存储日志失败:', error);
            // 如果存储失败，清理一半的旧日志
            logs = logs.slice(Math.floor(logs.length / 2));
            try {
                localStorage.setItem('applicationLogs', JSON.stringify(logs));
            } catch (e) {
                console.error('清理后存储日志仍然失败:', e);
            }
        }
    }

    exportLogs() {
        try {
            const logs = localStorage.getItem('applicationLogs');
            if (!logs) return null;
            
            const parsed = JSON.parse(logs);
            const blob = new Blob([JSON.stringify(parsed, null, 2)], {
                type: 'application/json'
            });
            
            return URL.createObjectURL(blob);
        } catch (error) {
            console.error('导出日志失败:', error);
            return null;
        }
    }

    clearLogs() {
        try {
            localStorage.removeItem('applicationLogs');
            this.info('日志已清除');
        } catch (error) {
            console.error('清除日志失败:', error);
        }
    }
}

// 创建全局实例
window.logger = new Logger('App');