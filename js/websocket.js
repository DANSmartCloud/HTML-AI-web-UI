class WebSocketManager {
    constructor(url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;
        this.messageQueue = [];
        this.handlers = new Map();
        this.isConnecting = false;
        
        // 自动重连
        this.setupAutoReconnect();
    }

    setupAutoReconnect() {
        window.addEventListener('online', () => {
            if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
                this.connect();
            }
        });
    }

    async connect() {
        if (this.isConnecting) return;
        this.isConnecting = true;

        try {
            this.ws = new WebSocket(this.url);
            
            this.ws.onopen = () => {
                this.reconnectAttempts = 0;
                this.isConnecting = false;
                this.processMessageQueue();
                this.triggerHandler('connect');
            };
            
            this.ws.onclose = () => {
                this.isConnecting = false;
                this.handleDisconnect();
            };
            
            this.ws.onerror = (error) => {
                this.isConnecting = false;
                this.triggerHandler('error', error);
                this.handleDisconnect();
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.triggerHandler('message', data);
                } catch (error) {
                    console.error('WebSocket消息解析错误:', error);
                }
            };
            
        } catch (error) {
            this.isConnecting = false;
            console.error('WebSocket连接失败:', error);
            this.handleDisconnect();
        }
    }

    handleDisconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
            
            console.log(`尝试重新连接 (${this.reconnectAttempts}/${this.maxReconnectAttempts}) 在 ${delay}ms 后...`);
            
            setTimeout(() => this.connect(), delay);
        } else {
            this.triggerHandler('maxReconnectAttemptsReached');
        }
    }

    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
            return true;
        } else {
            this.messageQueue.push(data);
            if (!this.isConnecting) {
                this.connect();
            }
            return false;
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.ws.readyState === WebSocket.OPEN) {
            const data = this.messageQueue.shift();
            this.send(data);
        }
    }

    on(event, handler) {
        if (!this.handlers.has(event)) {
            this.handlers.set(event, new Set());
        }
        this.handlers.get(event).add(handler);
    }

    off(event, handler) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).delete(handler);
        }
    }

    triggerHandler(event, data) {
        if (this.handlers.has(event)) {
            this.handlers.get(event).forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.error(`WebSocket事件处理器错误 (${event}):`, error);
                }
            });
        }
    }

    getState() {
        return {
            connected: this.ws && this.ws.readyState === WebSocket.OPEN,
            connecting: this.isConnecting,
            queueLength: this.messageQueue.length,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.messageQueue = [];
        this.reconnectAttempts = this.maxReconnectAttempts; // 防止自动重连
    }
}

// 健康检查和心跳包
class WebSocketHeartbeat {
    constructor(wsManager, options = {}) {
        this.wsManager = wsManager;
        this.options = {
            pingInterval: options.pingInterval || 30000,
            pongTimeout: options.pongTimeout || 10000
        };
        
        this.pingTimer = null;
        this.pongTimer = null;
        this.setup();
    }

    setup() {
        this.wsManager.on('connect', () => this.start());
        this.wsManager.on('message', (data) => {
            if (data.type === 'pong') {
                this.handlePong();
            }
        });
    }

    start() {
        this.stop();
        this.ping();
    }

    stop() {
        if (this.pingTimer) {
            clearTimeout(this.pingTimer);
            this.pingTimer = null;
        }
        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
    }

    ping() {
        this.wsManager.send({ type: 'ping', timestamp: Date.now() });
        
        this.pongTimer = setTimeout(() => {
            console.warn('WebSocket心跳超时，正在重连...');
            this.wsManager.ws.close();
        }, this.options.pongTimeout);
        
        this.pingTimer = setTimeout(() => this.ping(), this.options.pingInterval);
    }

    handlePong() {
        if (this.pongTimer) {
            clearTimeout(this.pongTimer);
            this.pongTimer = null;
        }
    }
}

// 导出
window.WebSocketManager = WebSocketManager;
window.WebSocketHeartbeat = WebSocketHeartbeat;