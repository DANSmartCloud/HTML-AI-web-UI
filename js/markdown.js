class MarkdownRenderer {
    constructor() {
        this.initialized = false;
        this.initializePromise = this.initialize();
    }

    async initialize() {
        try {
            // 等待所有依赖加载完成
            await new Promise(resolve => {
                if (window.marked && window.DOMPurify && window.hljs) {
                    resolve();
                } else {
                    window.addEventListener('load', () => {
                        if (window.marked && window.DOMPurify && window.hljs) {
                            resolve();
                        }
                    });
                }
            });

            // 配置marked选项
            const renderer = this.createRenderer();
            
            this.markedOptions = {
                renderer: renderer,
                gfm: true,
                breaks: true,
                pedantic: false,
                sanitize: false,
                smartypants: false,
                xhtml: false,
                highlight: (code, lang) => {
                    if (lang && hljs.getLanguage(lang)) {
                        try {
                            return hljs.highlight(code, { language: lang }).value;
                        } catch (e) {
                            console.error('代码高亮失败:', e);
                        }
                    }
                    return code;
                }
            };
            
            marked.setOptions(this.markedOptions);
            this.initialized = true;
        } catch (error) {
            console.error('初始化Markdown渲染器失败:', error);
            throw error;
        }
    }

    createRenderer() {
        const renderer = new marked.Renderer();

        // 自定义链接渲染
        renderer.link = (href, title, text) => {
            return `<a href="${href}" title="${title || ''}" target="_blank" rel="noopener noreferrer">${text}</a>`;
        };

        // 自定义图片渲染
        renderer.image = (href, title, text) => {
            return `<img src="${href}" alt="${text}" title="${title || ''}" class="max-w-full h-auto">`;
        };

        // 自定义代码块渲染
        renderer.code = (code, language) => {
            const validLanguage = hljs.getLanguage(language) ? language : 'plaintext';
            const highlightedCode = hljs.highlight(code, { language: validLanguage }).value;
            return `
                <div class="code-block relative">
                    <div class="code-header bg-gray-800 text-white px-4 py-2 flex justify-between items-center rounded-t">
                        <span class="text-sm">${validLanguage}</span>
                        <button class="copy-code-btn text-sm hover:text-gray-300" onclick="window.utils.copyToClipboard(this.parentElement.nextElementSibling.textContent)">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <pre class="bg-gray-900 text-white p-4 rounded-b overflow-x-auto"><code class="language-${validLanguage}">${highlightedCode}</code></pre>
                </div>
            `;
        };

        // 自定义表格渲染
        renderer.table = (header, body) => {
            return `
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-gray-200">
                        <thead class="bg-gray-50">
                            ${header}
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-200">
                            ${body}
                        </tbody>
                    </table>
                </div>
            `;
        };

        // 自定义列表渲染
        renderer.list = (body, ordered) => {
            const type = ordered ? 'ol' : 'ul';
            const className = ordered ? 'list-decimal' : 'list-disc';
            return `<${type} class="${className} pl-4 space-y-1">${body}</${type}>`;
        };

        // 自定义引用渲染
        renderer.blockquote = (quote) => {
            return `<blockquote class="border-l-4 border-gray-300 pl-4 italic text-gray-600">${quote}</blockquote>`;
        };

        return renderer;
    }

    async render(markdown) {
        try {
            if (!this.initialized) {
                await this.initializePromise;
            }
            
            if (!markdown) return '';
            
            // 转换Markdown为HTML
            const html = marked.parse(markdown, this.markedOptions);
            
            // 净化HTML
            const cleanHtml = DOMPurify.sanitize(html, {
                ADD_TAGS: ['iframe'],
                ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
            });
            
            return cleanHtml;
        } catch (error) {
            console.error('Markdown渲染失败:', error);
            return `<p class="text-red-500">渲染失败: ${error.message}</p>`;
        }
    }
}

// 创建全局Markdown渲染器实例
window.markdownRenderer = new MarkdownRenderer(); 