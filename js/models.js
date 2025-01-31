//models.js created by 禾云信创
class ModelManager {
    constructor() {
        this.bindEvents();
        this.loadModels();
    }

    bindEvents() {
        // 拉取模型
        document.getElementById('pullModelBtn').addEventListener('click', async () => {
            const modelName = document.getElementById('modelNameInput').value.trim();
            if (!modelName) {
                window.ui.localModelList.appendChild(
                    window.ui.showError('请输入模型名称')
                );
                return;
            }

            try {
                const loadingElement = window.ui.showLoading();
                window.ui.localModelList.appendChild(loadingElement);

                // 使用流式API拉取模型
                const response = await window.ollamaAPI.pullModel(modelName);
                
                // 处理流式响应
                const progressBar = this.createProgressBar();
                window.ui.localModelList.appendChild(progressBar);
                
                for await (const chunk of response) {
                    if (chunk.status === 'downloading') {
                        const progress = (chunk.completed / chunk.total) * 100;
                        this.updateProgressBar(progressBar, progress);
                    }
                }
                
                loadingElement.remove();
                progressBar.remove();
                
                window.ui.localModelList.appendChild(
                    window.ui.showSuccess(`成功拉取模型: ${modelName}`)
                );
                
                await this.loadModels();
            } catch (error) {
                console.error('拉取模型失败:', error);
                window.ui.localModelList.appendChild(
                    window.ui.showError('拉取模型失败: ' + error.message)
                );
            }
        });

        // 推送模型
        document.getElementById('pushModelBtn').addEventListener('click', async () => {
            const modelName = document.getElementById('pushModelNameInput').value.trim();
            if (!modelName) {
                window.ui.localModelList.appendChild(
                    window.ui.showError('请输入模型名称')
                );
                return;
            }

            try {
                const loadingElement = window.ui.showLoading();
                window.ui.localModelList.appendChild(loadingElement);

                // 使用流式API推送模型
                const response = await window.ollamaAPI.pushModel(modelName);
                
                // 处理流式响应
                const progressBar = this.createProgressBar();
                window.ui.localModelList.appendChild(progressBar);
                
                for await (const chunk of response) {
                    if (chunk.status === 'uploading') {
                        const progress = (chunk.completed / chunk.total) * 100;
                        this.updateProgressBar(progressBar, progress);
                    }
                }
                
                loadingElement.remove();
                progressBar.remove();
                
                window.ui.localModelList.appendChild(
                    window.ui.showSuccess(`成功推送模型: ${modelName}`)
                );
            } catch (error) {
                console.error('推送模型失败:', error);
                window.ui.localModelList.appendChild(
                    window.ui.showError('推送模型失败: ' + error.message)
                );
            }
        });

        // 模型操作事件委托
        document.getElementById('localModelList').addEventListener('click', async (e) => {
            const action = e.target.closest('button')?.dataset.action;
            if (!action) return;

            const modelItem = e.target.closest('.model-item');
            const modelName = modelItem.querySelector('span').textContent;

            switch (action) {
                case 'info':
                    await this.showModelInfo(modelName);
                    break;
                case 'delete':
                    await this.deleteModel(modelName, modelItem);
                    break;
                case 'copy':
                    const newName = prompt('请输入新模型名称:', modelName + '_copy');
                    if (newName) {
                        await this.copyModel(modelName, newName);
                    }
                    break;
            }
        });

        // 更新当前模型显示
        document.addEventListener('model-selected', (e) => {
            const modelName = e.detail;
            document.getElementById('currentModel').querySelector('span').textContent = modelName;
        });
    }

    createProgressBar() {
        const div = document.createElement('div');
        div.className = 'progress-bar mt-4';
        div.innerHTML = `
            <div class="progress-bar-fill" style="width: 0%"></div>
        `;
        return div;
    }

    updateProgressBar(progressBar, percentage) {
        progressBar.querySelector('.progress-bar-fill').style.width = `${percentage}%`;
    }

    async loadModels() {
        try {
            const response = await window.ollamaAPI.listModels();
            window.ui.updateModelList(response.models);

            // 同时获取运行中的模型
            const runningModels = await window.ollamaAPI.listRunningModels();
            this.updateRunningStatus(runningModels.models);
        } catch (error) {
            console.error('加载模型列表失败:', error);
            window.ui.modelList.appendChild(
                window.ui.showError('加载模型列表失败: ' + error.message)
            );
        }
    }

    updateRunningStatus(runningModels) {
        document.querySelectorAll('.model-item').forEach(item => {
            const modelName = item.querySelector('span').textContent;
            const isRunning = runningModels.some(m => m.name === modelName);
            
            const statusIcon = item.querySelector('.model-status');
            if (statusIcon) {
                statusIcon.className = `model-status ${isRunning ? 'text-green-500' : 'text-gray-400'}`;
                statusIcon.title = isRunning ? '运行中' : '未运行';
            }
        });
    }

    async showModelInfo(modelName) {
        try {
            const loadingElement = window.ui.showLoading();
            window.ui.localModelList.appendChild(loadingElement);

            const info = await window.ollamaAPI.getModelInfo(modelName);
            
            loadingElement.remove();

            // 创建信息显示元素
            const infoElement = document.createElement('div');
            infoElement.className = 'bg-gray-100 p-4 rounded-lg mt-4';
            infoElement.innerHTML = `
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold">模型信息: ${modelName}</h3>
                    <button class="text-gray-500 hover:text-gray-700" onclick="this.closest('.bg-gray-100').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <div class="font-medium mb-2">基本信息</div>
                        <div class="space-y-1">
                            <div>格式: ${info.details.format}</div>
                            <div>家族: ${info.details.family}</div>
                            <div>参数量: ${info.details.parameter_size}</div>
                            <div>量化等级: ${info.details.quantization_level}</div>
                        </div>
                    </div>
                    <div>
                        <div class="font-medium mb-2">模型配置</div>
                        <div class="space-y-1">
                            <div>上下文长度: ${info.model_info?.['llama.context_length'] || 'N/A'}</div>
                            <div>词表大小: ${info.model_info?.['llama.vocab_size'] || 'N/A'}</div>
                            <div>Embedding维度: ${info.model_info?.['llama.embedding_length'] || 'N/A'}</div>
                        </div>
                    </div>
                </div>
                <div class="mt-4">
                    <div class="font-medium mb-2">模板</div>
                    <pre class="text-xs bg-gray-800 text-gray-100 p-2 rounded">${info.template || 'N/A'}</pre>
                </div>
            `;

            // 移除之前的信息显示（如果有）
            const existingInfo = window.ui.localModelList.querySelector('.bg-gray-100');
            if (existingInfo) {
                existingInfo.remove();
            }

            window.ui.localModelList.appendChild(infoElement);
        } catch (error) {
            console.error('获取模型信息失败:', error);
            window.ui.localModelList.appendChild(
                window.ui.showError('获取模型信息失败: ' + error.message)
            );
        }
    }

    async deleteModel(modelName, modelItem) {
        if (!confirm(`确定要删除模型 ${modelName} 吗？此操作不可恢复。`)) {
            return;
        }

        try {
            const loadingElement = window.ui.showLoading();
            modelItem.appendChild(loadingElement);

            await window.ollamaAPI.deleteModel(modelName);
            
            await this.loadModels();
            
            window.ui.localModelList.appendChild(
                window.ui.showSuccess(`成功删除模型: ${modelName}`)
            );

            // 如果删除的是当前选中的模型，清除选择
            if (window.ui.activeModel === modelName) {
                window.ui.activeModel = null;
                document.getElementById('currentModel').querySelector('span').textContent = '未选择模型';
            }
        } catch (error) {
            console.error('删除模型失败:', error);
            window.ui.localModelList.appendChild(
                window.ui.showError('删除模型失败: ' + error.message)
            );
        }
    }

    async copyModel(source, destination) {
        try {
            const loadingElement = window.ui.showLoading();
            window.ui.localModelList.appendChild(loadingElement);

            await window.ollamaAPI.copyModel(source, destination);
            
            loadingElement.remove();
            window.ui.localModelList.appendChild(
                window.ui.showSuccess(`成功复制模型: ${source} -> ${destination}`)
            );
            
            await this.loadModels();
        } catch (error) {
            console.error('复制模型失败:', error);
            window.ui.localModelList.appendChild(
                window.ui.showError('复制模型失败: ' + error.message)
            );
        }
    }
}

// 创建全局ModelManager实例
window.modelManager = new ModelManager(); 