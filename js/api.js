class OllamaAPI {
    constructor() {
        this.baseUrl = 'http://localhost:11434';
        this.version = null;
    }

    setBaseUrl(url) {
        if (!url) return;
        this.baseUrl = url.trim().replace(/\/$/, '');
    }

    async getVersion() {
        try {
            const response = await fetch(`${this.baseUrl}/api/version`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.version = data.version;
            return this.version;
        } catch (error) {
            console.error('获取版本失败:', error);
            return null;
        }
    }

    async chat(params) {
        try {
            const response = await fetch(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
        } catch (error) {
            console.error('聊天请求失败:', error);
            throw error;
        }
    }

    async generateEmbeddings(params) {
        try {
            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.embedding;
        } catch (error) {
            console.error('生成嵌入向量失败:', error);
            throw error;
        }
    }

    async listModels() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.models;
        } catch (error) {
            console.error('获取模型列表失败:', error);
            return [];
        }
    }

    async pullModel(params) {
        try {
            const response = await fetch(`${this.baseUrl}/api/pull`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            return response;
        } catch (error) {
            console.error('拉取模型失败:', error);
            throw error;
        }
    }

    async deleteModel(params) {
        try {
            const response = await fetch(`${this.baseUrl}/api/delete`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('删除模型失败:', error);
            throw error;
        }
    }
}

// 创建全局API实例
window.api = new OllamaAPI(); 