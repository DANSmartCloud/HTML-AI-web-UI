//ui.js created by 禾云信创
//TODO: 暗色模式全局适配
//TODO: 识别AI的思考标签部分
class UI {
    constructor() {
        // 确保工具类已初始化
        if (!window.utils) {
            throw new Error('工具类未初始化');
        }

        this.activeModel = null;
        this.initialized = false;
        this.elements = {};
        this.darkMode = localStorage.getItem('darkMode') === 'true';

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
            await this.loadSettings();
            this.applyTheme();
            this.initialized = true;
        } catch (error) {
            console.error('UI初始化失败:', error);
            window.chat.showToast('UI初始化失败: ' + error.message, 'error');
        }
    }

    async initializeElements() {
        try {
            this.elements = {
                // 主要元素
                chatContainer: document.getElementById('chatContainer'),
                messageContainer: document.getElementById('messageContainer'),
                userInput: document.getElementById('userInput'),
                sendBtn: document.getElementById('sendBtn'),
                
                // 侧边栏按钮
                settingsBtn: document.getElementById('settingsBtn'),
                newChatBtn: document.getElementById('newChatBtn'),
                clearBtn: document.getElementById('clearBtn'),
                exportBtn: document.getElementById('exportBtn'),
                modelBtn: document.getElementById('modelBtn'),
                
                // 模态框
                modelModal: document.getElementById('modelModal'),
                settingsModal: document.getElementById('settingsModal'),
                
                // 模型相关
                modelList: document.getElementById('modelList'),
                pullModelBtn: document.getElementById('pullModelBtn'),
                currentModel: document.getElementById('currentModel'),
                
                // 设置相关
                apiUrl: document.getElementById('apiUrl'),
                temperature: document.getElementById('temperature'),
                saveSettingsBtn: document.getElementById('saveSettingsBtn'),
                darkMode: document.getElementById('darkMode'),
                modalCloseButtons: document.querySelectorAll('.modal-close')
            };

            // 验证必需的元素
            const requiredElements = [
                'chatContainer',
                'messageContainer',
                'userInput',
                'sendBtn',
                'modelModal',
                'settingsModal',
                'modelList'
            ];

            for (const elementId of requiredElements) {
                if (!this.elements[elementId]) {
                    throw new Error(`Required element ${elementId} not found`);
                }
            }

        } catch (error) {
            console.error('初始化UI元素失败:', error);
            throw error;
        }
    }

    bindEvents() {
        const { elements } = this;

        // 设置按钮
        elements.settingsBtn?.addEventListener('click', () => this.showModal('settings'));

        // 模型按钮
        elements.modelBtn?.addEventListener('click', () => this.showModal('model'));

        // 关闭模态框
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => this.hideModals());
        });

        // 点击模态框背景关闭
        elements.modelModal?.addEventListener('click', (e) => {
            if (e.target === elements.modelModal) {
                this.hideModals();
            }
        });

        elements.settingsModal?.addEventListener('click', (e) => {
            if (e.target === elements.settingsModal) {
                this.hideModals();
            }
        });

        // 保存设置
        elements.saveSettingsBtn?.addEventListener('click', () => this.saveSettings());

        // 拉取模型
        elements.pullModelBtn?.addEventListener('click', () => this.showPullModelDialog());

        // 键盘快捷键
        document.addEventListener('keydown', (e) => {
            // Esc关闭模态框
            if (e.key === 'Escape') {
                this.hideModals();
            }
            
            // Ctrl+,打开设置
            if (e.ctrlKey && e.key === ',') {
                e.preventDefault();
                this.showModal('settings');
            }
        });

        // 删除所有对话
        const deleteAllChatsBtn = document.getElementById('deleteAllChatsBtn');
        if (deleteAllChatsBtn) {
            deleteAllChatsBtn.addEventListener('click', () => {
                if (confirm('确定要删除所有对话吗？此操作不可恢复。')) {
                    window.chat.deleteAllChats();
                }
            });
        }

        // 暗色模式切换
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.setAttribute('aria-checked', this.darkMode);
            darkModeToggle.addEventListener('click', () => {
                this.darkMode = !this.darkMode;
                darkModeToggle.setAttribute('aria-checked', this.darkMode);
                this.applyTheme();
                localStorage.setItem('darkMode', this.darkMode);
            });
        }
    }

    showModal(type) {
        const { elements } = this;
        
        this.hideModals();
        
        const modal = type === 'model' ? elements.modelModal : elements.settingsModal;
        if (!modal) return;
        
        // 移除hidden类并添加显示动画
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        
        // 禁用背景滚动
        document.body.style.overflow = 'hidden';
        
        // 添加点击背景关闭
        const handleBackdropClick = (e) => {
            if (e.target === modal) {
                this.hideModals();
            }
        };
        modal.addEventListener('click', handleBackdropClick);
        
        // 更新模型列表（如果是模型模态框）
        if (type === 'model') {
            this.updateModelList();
        }
    }

    hideModals() {
        const { elements } = this;
        const modals = [elements.modelModal, elements.settingsModal];
        
        modals.forEach(modal => {
            if (!modal) return;
            
            // 添加hidden类并移除显示样式
            modal.classList.add('hidden');
            modal.style.display = 'none';
        });
        
        // 恢复背景滚动
        document.body.style.overflow = '';
    }

    async updateModelList() {
        const { elements } = this;
        if (!elements.modelList) return;
        
        try {
            elements.modelList.innerHTML = '<div class="text-center py-4"><div class="loading"></div></div>';
            
            const response = await fetch(window.utils.storage.get('apiUrl', 'http://localhost:11434') + '/api/tags');
            if (!response.ok) {
                throw new Error(`获取模型列表失败: ${response.status}`);
            }
            
            const data = await response.json();
            const models = data.models || [];
            
            if (models.length === 0) {
                elements.modelList.innerHTML = '<div class="text-center py-4 text-gray-500 dark:text-gray-400">暂无模型</div>';
                return;
            }
            
            elements.modelList.innerHTML = '';
            
            models.forEach(model => {
                const modelDiv = document.createElement('div');
                modelDiv.className = 'model-item flex items-center justify-between p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors duration-200';
                
                const currentModel = window.utils.storage.get('currentModel');
                const isCurrentModel = model.name === currentModel;
                
                modelDiv.innerHTML = `
                    <div class="flex-1">
                        <div class="model-name font-medium dark:text-white">${model.name}</div>
                        <div class="model-details text-sm text-gray-500 dark:text-gray-400">
                            <span>${model.details?.parameter_size || 'Unknown'}</span>
                            ${model.details?.quantization_level ? ` | ${model.details.quantization_level}` : ''}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2">
                        <button class="set-default-btn px-2 py-1 text-sm text-blue-500 rounded hover:bg-blue-100 dark:hover:bg-blue-900" title="设为默认模型">
                            <i class="fas fa-star"></i>
                        </button>
                        <button class="delete-model-btn px-2 py-1 text-sm text-red-500 rounded hover:bg-red-100 dark:hover:bg-red-900" title="删除模型">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                // 选择模型
                modelDiv.addEventListener('click', (e) => {
                    if (!e.target.closest('.set-default-btn') && !e.target.closest('.delete-model-btn')) {
                        window.chat.setModel(model.name);
                        this.hideModals();
                    }
                });
                
                // 设为默认模型
                modelDiv.querySelector('.set-default-btn')?.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.chat.setDefaultModel(model.name);
                    this.showToast(`已将 ${model.name} 设为默认模型`);
                });
                
                // 删除模型
                modelDiv.querySelector('.delete-model-btn')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (confirm(`确定要删除模型 ${model.name} 吗？`)) {
                        try {
                            const response = await fetch(window.utils.storage.get('apiUrl', 'http://localhost:11434') + '/api/delete', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({ name: model.name })
                            });
                            
                            if (!response.ok) {
                                throw new Error(`删除失败: ${response.status}`);
                            }
                            
                            window.chat.showToast(`模型 ${model.name} 已删除`);
                            await this.updateModelList();
                        } catch (error) {
                            console.error('删除模型失败:', error);
                            window.chat.showToast('删除模型失败: ' + error.message, 'error');
                        }
                    }
                });
                
                elements.modelList.appendChild(modelDiv);
            });
            
        } catch (error) {
            console.error('获取模型列表失败:', error);
            elements.modelList.innerHTML = `
                <div class="text-center py-4 text-red-500">
                    获取模型列表失败: ${error.message}
                </div>
            `;
        }
    }

    async showPullModelDialog() {
        const modelName = prompt('请输入要拉取的模型名称:');
        if (!modelName) return;
        
        try {
            const response = await fetch(window.utils.storage.get('apiUrl', 'http://localhost:11434') + '/api/pull', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: modelName })
            });
            
            if (!response.ok) {
                throw new Error(`拉取失败: ${response.status}`);
            }
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const data = JSON.parse(chunk);
                
                if (data.status) {
                    window.chat.showToast(data.status);
                }
                
                if (data.error) {
                    throw new Error(data.error);
                }
            }
            
            window.chat.showToast('模型拉取成功');
            await this.updateModelList();
            
        } catch (error) {
            console.error('拉取模型失败:', error);
            window.chat.showToast('拉取模型失败: ' + error.message, 'error');
        }
    }

    async loadSettings() {
        const { elements } = this;
        
        // 加载API地址
        const apiUrl = window.utils.storage.get('apiUrl', 'http://localhost:11434');
        if (elements.apiUrl) {
            elements.apiUrl.value = apiUrl;
        }
        
        // 加载温度设置
        const temperature = window.utils.storage.get('temperature', 0.7);
        if (elements.temperature) {
            elements.temperature.value = temperature;
        }
        
        // 加载主题设置
        const darkModeToggle = document.getElementById('darkMode');
        if (darkModeToggle) {
            darkModeToggle.setAttribute('aria-checked', this.darkMode);
        }
        
        // 加载当前模型
        const currentModel = window.utils.storage.get('currentModel');
        if (currentModel && elements.currentModel) {
            elements.currentModel.textContent = currentModel;
        }
    }

    saveSettings() {
        const { elements } = this;
        
        try {
            // 保存API地址
            const apiUrl = elements.apiUrl?.value;
            if (apiUrl) {
                window.utils.storage.set('apiUrl', apiUrl);
            }
            
            // 保存温度设置
            const temperature = elements.temperature?.value;
            if (temperature) {
                window.utils.storage.set('temperature', parseFloat(temperature));
            }
            
            // 保存主题设置
            localStorage.setItem('darkMode', this.darkMode);
            
            this.hideModals();
            window.chat.showToast('设置已保存');
            
        } catch (error) {
            console.error('保存设置失败:', error);
            window.chat.showToast('保存设置失败: ' + error.message, 'error');
        }
    }

    applyTheme() {
        document.documentElement.classList.toggle('dark', this.darkMode);
        document.body.classList.toggle('dark', this.darkMode);
        
        // 更新模态框样式
        const modals = document.querySelectorAll('.modal-content');
        modals.forEach(modal => {
            if (this.darkMode) {
                modal.classList.add('dark');
            } else {
                modal.classList.remove('dark');
            }
        });

        // 更新 chatContainer 样式
        const chatContainer = this.elements.chatContainer;
        if (chatContainer) {
            if (this.darkMode) {
                chatContainer.classList.add('dark');
            } else {
                chatContainer.classList.remove('dark');
            }
        }
    }
}

// 创建全局UI实例
window.ui = new UI(); 