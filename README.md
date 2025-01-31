# HTML-AI-web-UI  禾云信创AI大模型交互系统

这是一个禾云信创工作室开发的、基于Ollama API的纯静态AI大模型交互前端项目。它提供了一个美观、功能完备的用户界面，用于与Ollama API进行交互。

## 功能特点

- 🤖 支持多个模型的管理和切换
- 💬 实时聊天界面
- 📥 模型的拉取和推送
- ⚙️ 可配置的模型参数
- 💾 自动保存聊天记录
- ⌨️ 快捷键支持
- 🎨 美观的UI设计
- 📱 响应式布局

## 快速开始

1. 确保你已经安装并运行了Ollama服务器
2. 克隆本项目到本地
3. 使用Web服务器(如Python的http.server)启动项目:

```bash
# 如果你有Python 3
python -m http.server 8000

# 或者使用Node.js的http-server 若需要调试源代码，可以携带参数-c-1
npx http-server
```

4. 在浏览器中访问 `http://localhost:8000`（或是你的自定义端口号）
5. Windows环境下，如果你已经安装了node，也可以直接运行项目中的`test.bat`脚本启动项目

## 使用说明

### 模型管理

- 点击右上角的"模型管理"按钮打开模型管理界面
- 在"拉取模型"标签页中输入模型名称并点击"拉取模型"按钮来下载新模型
- 在"本地模型"标签页中可以查看、删除已安装的模型
- 点击模型列表中的模型名称可以选择该模型进行对话

### 聊天

- 在左侧选择要使用的模型
- 在底部输入框中输入问题
- 按回车键或点击发送按钮发送消息
- 聊天记录会自动保存

### 设置

- 点击右上角的"设置"按钮打开设置界面
- 可以配置API地址、温度、最大上下文长度等参数
- 设置会自动保存到本地存储

### 快捷键

- `Ctrl/Cmd + /`: 打开设置
- `Esc`: 关闭当前打开的模态框
- `Enter`: 发送消息
- `Shift + Enter`: 在输入框中换行

## 技术栈

- HTML5
- CSS3 (Tailwind CSS)
- JavaScript (ES6+)
- Font Awesome 图标
- localStorage 用于本地存储

## 浏览器支持

- Chrome (推荐)
- Firefox
- Safari
- Edge

## 注意事项

- 确保Ollama API服务器正在运行且可访问
- 默认API地址为 `http://localhost:11434`
- 部分功能(如剪贴板操作)可能需要HTTPS或localhost环境
- 建议使用现代浏览器以获得最佳体验

## 贡献

欢迎提交Issue和Pull Request来帮助改进这个项目！

## 许可证

MIT License
