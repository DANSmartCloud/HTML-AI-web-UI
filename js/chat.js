class Chat {
    constructor() {
        this.messages = [];
        this.currentModel = null;
        this.streaming = false;
        this.controller = null;
        this.currentChatId = null;
        this.chats = new Map();
        this.initialized = false;
        this.elements = {};
        this.thinkContents = new Map(); // 存储think标签内容
        this.defaultModel = window.utils.cookies.get('defaultModel');
        this.welcomeMessageElement = document.getElementById('welcomeMessage');

        // 等待DOM加载完成后初始化
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            await this.initializeElements();
            this.bindEvents();
            await this.loadChats();
            this.initialized = true;
        } catch (error) {
            console.error('Chat初始化失败:', error);
            this.showError('Chat初始化失败: ' + error.message);
        }
    }

    async initializeElements() {
        try {
            this.elements = {
                chatContainer: document.getElementById('chatContainer'),
                messageContainer: document.getElementById('messageContainer'),
                chatList: document.getElementById('chatList'),
                userInput: document.getElementById('userInput'),
                sendBtn: document.getElementById('sendBtn'),
                newChatBtn: document.getElementById('newChatBtn'),
                clearBtn: document.getElementById('clearBtn'),
                exportBtn: document.getElementById('exportBtn'),
                currentModel: document.getElementById('currentModel')
            };

            // 验证必需的元素
            const requiredElements = [
                'chatContainer',
                'messageContainer',
                'chatList',
                'userInput',
                'sendBtn'
            ];

            for (const elementId of requiredElements) {
                if (!this.elements[elementId]) {
                    throw new Error(`Required element ${elementId} not found`);
                }
            }

        } catch (error) {
            console.error('初始化Chat元素失败:', error);
            throw error;
        }
    }

    bindEvents() {
        const { elements } = this;

        // 发送消息
        elements.sendBtn.addEventListener('click', () => {
            if (this.streaming) {
                this.stopStreaming();
                elements.sendBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>发送';
            } else {
                const content = elements.userInput.value;
                if (content.trim()) {
                    this.handleMessageSend(content);
                    elements.userInput.value = '';
                }
            }
        });

        // 输入框回车发送
        elements.userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                elements.sendBtn.click();
            }
        });

        // 自动调整输入框高度
        elements.userInput.addEventListener('input', () => {
            elements.userInput.style.height = 'auto';
            elements.userInput.style.height = elements.userInput.scrollHeight + 'px';
        });

        // 新建聊天
        if (elements.newChatBtn) {
            elements.newChatBtn.addEventListener('click', () => this.createNewChat());
        }

        // 清空聊天
        if (elements.clearBtn) {
            elements.clearBtn.addEventListener('click', () => this.clearMessages());
        }

        // 导出聊天
        if (elements.exportBtn) {
            elements.exportBtn.addEventListener('click', () => this.exportChat());
        }
    }

    async handleMessageSend(content) {
        if (!content.trim() || (this.streaming && !this.controller)) return;
        
        const { elements } = this;
        
        try {
            // 禁用对话切换
            const chatList = document.getElementById('chatList');
            if (chatList) {
                chatList.style.pointerEvents = 'none';
                chatList.style.opacity = '0.5';
            }
            
            // 添加用户消息
            const userMessage = {
                role: 'user',
                content: content.trim(),
                time: Date.now()
            };
            
            await this.addMessage(userMessage);
            
            // 添加思考中的消息
            const thinkingMessage = {
                role: 'assistant',
                content: '<div class="thinking-animation"><span></span><span></span><span></span></div>',
                time: Date.now(),
                isThinking: true
            };
            await this.addMessage(thinkingMessage);
            
            // 准备API请求参数
            const messages = this.messages.filter(msg => !msg.isThinking).map(msg => ({
                role: msg.role,
                content: msg.content
            }));
            
            // 创建AbortController
            this.controller = new AbortController();
            this.streaming = true;
            
            // 更新发送按钮为停止按钮
            elements.sendBtn.innerHTML = '<i class="fas fa-stop mr-2"></i>停止';
            elements.sendBtn.classList.add('streaming');
            
            // 检查是否选择了模型
            if (!this.currentModel) {
                throw new Error('请先选择一个模型');
            }
            
            // 获取温度设置
            const temperature = parseFloat(window.utils.storage.get('temperature', '0.7'));
            
            // 发送请求
            const response = await window.api.chat({
                model: this.currentModel,
                messages: messages,
                stream: true,
                options: {
                    temperature: temperature
                },
                signal: this.controller.signal // 添加signal以支持中断
            });
            
            if (!response.ok) {
                throw new Error(`API请求失败: ${response.status}`);
            }
            
            // 移除思考中的消息
            this.messages = this.messages.filter(msg => !msg.isThinking);
            await this.renderMessages();
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let assistantMessage = {
                role: 'assistant',
                content: '',
                time: Date.now(),
                history: [],
                currentVersion: 0,
                thinkContents: []
            };
            
            await this.addMessage(assistantMessage);
            
            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim());
                
                for (const line of lines) {
                    if (!this.streaming) break; // 检查是否已停止
                    
                    try {
                        const data = JSON.parse(line);
                        if (data.done) continue;
                        
                        assistantMessage.content += data.message?.content || '';
                        
                        // 解析think标签
                        const thinkMatches = [...(data.message?.content || '').matchAll(/<think>(.*?)<\/think>/gs)];
                        if (thinkMatches.length > 0) {
                            assistantMessage.thinkContents.push(...thinkMatches.map(match => match[1]));
                        }
                        
                        await this.updateLastMessage(assistantMessage);
                    } catch (e) {
                        console.warn('解析响应数据失败:', e);
                    }
                }
                
                if (!this.streaming) break; // 检查是否已停止
            }
            
        } catch (error) {
            if (error.name === 'AbortError') {
                this.showToast('已停止生成');
            } else {
                console.error('发送消息失败:', error);
                this.showToast('发送消息失败: ' + error.message, 'error');
            }
        } finally {
            this.streaming = false;
            this.controller = null;
            elements.sendBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>发送';
            elements.sendBtn.classList.remove('streaming');
            
            // 移除思考中的消息
            this.messages = this.messages.filter(msg => !msg.isThinking);
            await this.renderMessages();
            
            // 重新启用对话切换
            const chatList = document.getElementById('chatList');
            if (chatList) {
                chatList.style.pointerEvents = 'auto';
                chatList.style.opacity = '1';
            }
            
            this.saveMessages();
        }
    }

    async addMessage(message) {
        this.messages.push(message);
        this.showWelcomeMessage(false);
        await this.renderMessage(message);
        this.scrollToBottom();
    }

    async updateLastMessage(message) {
        const lastMessage = this.messages[this.messages.length - 1];
        if (lastMessage) {
            Object.assign(lastMessage, message);
            await this.renderMessages();
        }
    }

    async renderMessages() {
        const { messageContainer } = this.elements;
        if (!messageContainer) return;
        
        messageContainer.innerHTML = '';
        for (const message of this.messages) {
            await this.renderMessage(message);
        }
        this.scrollToBottom();
    }

    async renderMessage(message) {
        const { messageContainer } = this.elements;
        if (!messageContainer) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.role}`;
        messageDiv.dataset.messageId = message.time;
        
        // 处理<think>标签
        let processedContent = message.content;
        const thinkMatches = [...message.content.matchAll(/<think>(.*?)<\/think>/gs)];
        const thinkContents = thinkMatches.map(match => match[1]);
        
        thinkMatches.forEach((match, index) => {
            processedContent = processedContent.replace(match[0], `<div class="think-block"><div class="think-marker"></div><div class="think-content">${match[1]}</div></div>`);
        });
        
        const renderedContent = await window.markdownRenderer.render(processedContent);
        
        const html = `
            <div class="message-avatar ${message.role}">
                <i class="fas fa-${message.role === 'user' ? 'user' : 'robot'}"></i>
            </div>
            <div class="message-content ${message.role === 'user' ? 'text-right' : ''}">
                <div class="message-header">
                    <span class="message-name">${message.role === 'user' ? '用户' : 'AI助手'}</span>
                    <span class="message-time">${window.utils.formatDate(message.time)}</span>
                </div>
                <div class="message-bubble prose ${message.role === 'user' ? 'ml-auto' : 'mr-auto'} max-w-3xl">
                    ${renderedContent}
                </div>
                <div class="message-actions ${message.role === 'user' ? 'justify-end' : ''}">
                    <button class="message-action-btn" onclick="window.chat.copyMessage(this)" title="复制">
                        <i class="fas fa-copy"></i>
                    </button>
                    ${message.role === 'user' ? `
                        <button class="message-action-btn" onclick="window.chat.editMessage(this)" title="编辑">
                            <i class="fas fa-edit"></i>
                        </button>
                    ` : `
                        <button class="message-action-btn" onclick="window.chat.regenerateMessage(this)" title="重新生成">
                            <i class="fas fa-redo"></i>
                        </button>
                        ${message.history?.length > 0 ? `
                            <div class="history-selector">
                                <select onchange="window.chat.switchHistory(this)" value="${message.currentVersion === 0 ? '' : (message.currentVersion - 1)}">
                                    <option value="">当前回复</option>
                                    ${message.history.map((_, i) => `
                                        <option value="${i}" ${message.currentVersion === i + 1 ? 'selected' : ''}>历史回复 ${i + 1}</option>
                                    `).join('')}
                                </select>
                            </div>
                        ` : ''}
                    `}
                </div>
            </div>
        `;
        
        messageDiv.innerHTML = html;
        messageContainer.appendChild(messageDiv);
    }

    scrollToBottom() {
        const { chatContainer } = this.elements;
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    async createNewChat() {
        const chatId = window.utils.generateId();
        const chat = {
            id: chatId,
            title: '新对话',
            messages: [],
            createdAt: Date.now()
        };
        
        this.chats.set(chatId, chat);
        await this.switchChat(chatId);
        this.saveChats();
        this.updateChatList();
        this.showWelcomeMessage(true);
    }

    updateChatList() {
        const { chatList } = this.elements;
        if (!chatList) return;
        
        chatList.innerHTML = '';
        
        // 按时间倒序排列
        const sortedChats = Array.from(this.chats.values())
            .sort((a, b) => b.createdAt - a.createdAt);
        
        const template = document.getElementById('chatItemTemplate').innerHTML;
        
        sortedChats.forEach(chat => {
            const chatDiv = document.createElement('div');
            chatDiv.innerHTML = template.replace(/\${([^}]+)}/g, (_, expr) => {
                return eval(expr);
            });
            
            const chatItem = chatDiv.firstElementChild;
            
            // 点击对话切换
            chatItem.querySelector('.chat-item-content').addEventListener('click', () => {
                this.switchChat(chat.id);
            });
            
            // 删除对话
            chatItem.querySelector('.delete-chat-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('确定要删除这个对话吗？删除后将自动新建对话。删除的对话不可恢复！您可以在页面右上角导出对话的JSON文件！')) {
                    this.deleteChat(chat.id);
                }
            });
            
            chatList.appendChild(chatItem);
        });
    }

    async deleteAllChats() {
        this.chats.clear();
        window.utils.storage.remove('chats');
        this.messages = [];
        await this.renderMessages();
        await this.createNewChat();
        this.showToast('已删除所有对话');
        // 刷新页面以重置状态
        window.location.reload();
    }

    async switchChat(chatId) {
        const chat = this.chats.get(chatId);
        if (!chat) return;

        this.currentChatId = chatId;
        this.messages = [...chat.messages];
        await this.renderMessages();
        this.updateChatList();
        this.showWelcomeMessage(this.messages.length === 0);
    }

    deleteChat(chatId) {
        this.chats.delete(chatId);
        if (this.currentChatId === chatId) {
            this.createNewChat();
        } else {
            this.updateChatList();
        }
        this.saveChats();
    }

    async clearMessages() {
        this.messages = [];
        await this.renderMessages();
        this.saveMessages();
    }

    exportChat() {
        if (!this.currentChatId) return;

        const chat = this.chats.get(this.currentChatId);
        if (!chat) return;

        const data = {
            title: chat.title,
            createdAt: chat.createdAt,
            messages: chat.messages
        };

        const filename = `chat_${chat.title}_${window.utils.formatDate(chat.createdAt)}.json`;
        window.utils.downloadFile(filename, JSON.stringify(data, null, 2));
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded shadow-lg ${
            type === 'error' ? 'bg-red-500' : 'bg-green-500'
        } text-white`;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    saveMessages() {
        if (this.currentChatId) {
            const chat = this.chats.get(this.currentChatId);
            if (chat) {
                chat.messages = [...this.messages];
                this.saveChats();
            }
        }
    }

    saveChats() {
        const chatsObj = Object.fromEntries(this.chats);
        window.utils.storage.set('chats', chatsObj);
    }

    async loadChats() {
        try {
            const savedChats = window.utils.storage.get('chats', {});
            this.chats = new Map(Object.entries(savedChats));
            
            if (this.chats.size === 0) {
                await this.createNewChat();
            } else {
                // 加载最近的对话
                const lastChat = Array.from(this.chats.values())
                    .sort((a, b) => b.createdAt - a.createdAt)[0];
                if (lastChat) {
                    await this.switchChat(lastChat.id);
                }
            }
            
            this.updateChatList();
        } catch (error) {
            console.error('加载对话失败:', error);
            this.showError('加载对话失败: ' + error.message);
            await this.createNewChat();
        }
    }

    setModel(model) {
        this.currentModel = model;
        if (this.elements.currentModel) {
            this.elements.currentModel.textContent = model;
        }
        window.utils.storage.set('currentModel', model);
    }

    setDefaultModel(model) {
        this.defaultModel = model;
        window.utils.cookies.set('defaultModel', model, 365); // 保存365天
        this.showToast(`已将 ${model} 设为默认模型`);
    }

    stopStreaming() {
        if (this.controller) {
            this.streaming = false;
            this.controller.abort();
            this.controller = null;
        }
    }

    async copyMessage(button) {
        const messageDiv = button.closest('.message');
        const content = messageDiv.querySelector('.message-bubble').textContent;
        
        // 排除<think>标签内容
        const cleanContent = content.replace(/^.*?think-content.*?$\n?/gm, '');
        
        try {
            await navigator.clipboard.writeText(cleanContent);
            this.showToast('复制成功');
        } catch (error) {
            console.error('复制失败:', error);
            this.showError('复制失败: ' + error.message);
        }
    }

    editMessage(button) {
        const messageDiv = button.closest('.message');
        const messageId = parseInt(messageDiv.dataset.messageId);
        const message = this.messages.find(m => m.time === messageId);
        
        if (!message) return;
        
        const content = message.content;
        const { userInput } = this.elements;
        
        if (userInput) {
            userInput.value = content;
            userInput.focus();
            userInput.setSelectionRange(content.length, content.length);
            
            // 删除这条消息及其后的所有消息
            const index = this.messages.indexOf(message);
            if (index !== -1) {
                this.messages = this.messages.slice(0, index);
                this.renderMessages();
                this.saveMessages();
            }
        }
    }

    async regenerateMessage(button) {
        const messageDiv = button.closest('.message');
        const messageId = parseInt(messageDiv.dataset.messageId);
        const message = this.messages.find(m => m.time === messageId);
        
        if (!message || this.streaming) return;
        
        try {
            // 保存当前回复到历史记录
            if (!message.history) {
                message.history = [];
            }
            message.history.push(message.content);
            
            // 删除这条消息及其后的所有消息
            const index = this.messages.indexOf(message);
            if (index !== -1) {
                this.messages = this.messages.slice(0, index);
                await this.renderMessages();
                
                // 重新生成回复
                const lastUserMessage = this.messages[this.messages.length - 1];
                if (lastUserMessage && lastUserMessage.role === 'user') {
                    await this.handleMessageSend(lastUserMessage.content);
                }
            }
        } catch (error) {
            console.error('重新生成失败:', error);
            this.showError('重新生成失败: ' + error.message);
        }
    }

    async switchHistory(select) {
        const messageDiv = select.closest('.message');
        const messageId = parseInt(messageDiv.dataset.messageId);
        const message = this.messages.find(m => m.time === messageId);
        
        if (!message || !message.history) return;
        
        const index = parseInt(select.value);
        if (isNaN(index)) {
            // 切换回当前回复
            message.currentVersion = 0;
            await this.updateLastMessage(message);
        } else {
            // 切换到历史回复
            const historicalContent = message.history[index];
            message.currentVersion = index + 1;
            const historicalMessage = { ...message, content: historicalContent };
            await this.updateLastMessage(historicalMessage);
        }
        
        // 更新选择器的值以匹配当前版本
        const selector = messageDiv.querySelector('.history-selector select');
        if (selector) {
            selector.value = message.currentVersion === 0 ? '' : (message.currentVersion - 1).toString();
        }
    }

    showWelcomeMessage(show = true) {
        if (this.welcomeMessageElement) {
            if (show && this.messages.length === 0) {
                this.welcomeMessageElement.style.display = 'flex';
                this.elements.messageContainer.style.display = 'none';
            } else {
                this.welcomeMessageElement.style.display = 'none';
                this.elements.messageContainer.style.display = 'block';
            }
        }
    }
}

// 创建全局Chat实例
window.chat = new Chat(); 