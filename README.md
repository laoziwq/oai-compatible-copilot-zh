# OAI Compatible Provider for Copilot（中文汉化版）

这是一个将 OpenAI/Ollama/Anthropic/Gemini API 提供器集成到 GitHub Copilot Chat 的 VSCode 扩展。

**这是原版扩展的中文汉化版本。**

原版仓库: [JohnnyZ93/oai-compatible-copilot](https://github.com/JohnnyZ93/oai-compatible-copilot)

## 功能特性

- **多 API 支持**: OpenAI/Ollama/Anthropic/Gemini API（ModelScope、SiliconFlow、DeepSeek 等）
- **视觉模型**: 完全支持图像理解功能
- **高级配置**: 灵活的聊天请求选项，支持思考/推理控制
- **多提供器管理**: 同时配置多个提供器的模型，自动管理 API 密钥
- **模型多配置**: 为同一模型定义不同设置（例如：GLM-4.6 启用/禁用思考）
- **可视化配置界面**: 直观的提供器和模型管理界面
- **自动重试**: 处理 API 错误（429、500、502、503、504），支持指数退避
- **Token 用量**: 实时 token 计数和状态栏提供器 API 密钥管理
- **Git 集成**: 直接从源代码管理生成提交消息
- **导入/导出**: 轻松分享和备份配置
- **工具优化**: 优化代理 `read_file` 工具处理，避免大文件读取小块

## 要求

- VS Code 1.104.0 或更高版本
- OpenAI 兼容提供器 API 密钥

## 快速开始

1. 安装 OAI Compatible Provider for Copilot 扩展
2. 打开 VS Code 设置，配置 `oaicopilot.baseUrl` 和 `oaicopilot.models`
3. 打开 GitHub Copilot Chat 界面
4. 点击模型选择器，选择 "管理模型..."
5. 选择 "OAI 兼容" 提供器
6. 输入您的 API 密钥 — 它将保存在本地
7. 选择要添加到模型选择器的模型

## 设置示例

```json
"oaicopilot.baseUrl": "https://api-inference.modelscope.cn/v1",
"oaicopilot.models": [
    {
        "id": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
        "owned_by": "modelscope",
        "context_length": 256000,
        "max_tokens": 8192,
        "temperature": 0,
        "top_p": 1
    }
]
```

## 配置界面

扩展提供了可视化配置界面，无需手动编辑 JSON 文件即可管理全局设置、提供器和模型。

### 打开配置界面

有两种方式打开配置界面：

1. **从命令面板**:
   - 按 `Ctrl+Shift+P`（macOS 为 `Cmd+Shift+P`）
   - 搜索 "OAICopilot: 打开配置界面"
   - 选择命令打开配置面板

2. **从状态栏**:
   - 点击 VS Code 右下角状态栏中的 "OAICopilot" 状态栏项

## 支持的 API 模式

扩展支持五种不同的 API 协议：

1. **`openai`**（默认）- OpenAI Chat Completions API
   - 端点: `/chat/completions`
   - 请求头: `Authorization: Bearer <apiKey>`
   - 用于: 大多数 OpenAI 兼容提供器（ModelScope、SiliconFlow 等）

2. **`openai-responses`** - OpenAI Responses API
   - 端点: `/responses`
   - 请求头: `Authorization: Bearer <apiKey>`
   - 用于: OpenAI 官方 Responses API

3. **`ollama`** - Ollama 原生 API
   - 端点: `/api/chat`
   - 用于: 本地 Ollama 实例

4. **`anthropic`** - Anthropic Claude API
   - 端点: `/v1/messages`
   - 请求头: `x-api-key: <apiKey>`
   - 用于: Anthropic Claude 模型

5. **`gemini`** - Gemini 原生 API
   - 端点: `/v1beta/models/{model}:streamGenerateContent?alt=sse`
   - 请求头: `x-goog-api-key: <apiKey>`
   - 用于: Google Gemini 模型

## 多提供器指南

模型配置中的 `owned_by`（别名：`provider` / `provide`）用于分组提供器特定的 API 密钥。存储键为 `oaicopilot.apiKey.<提供器ID小写>`。

1. 打开 VS Code 设置并配置 `oaicopilot.models`
2. 打开命令面板（Ctrl+Shift+P），搜索 "OAICopilot: 设置 OAI 兼容多提供器 API 密钥" 来配置提供器特定的 API 密钥
3. 打开 GitHub Copilot Chat 界面
4. 点击模型选择器并选择 "管理模型..."
5. 选择 "OAI 兼容" 提供器
6. 选择要添加到模型选择器的模型

## 同一模型的多配置

您可以使用 `configId` 字段为同一模型 ID 定义多个配置。这允许您为不同用例设置相同的基础模型。

例如：
```json
"oaicopilot.models": [
    {
        "id": "glm-4.6",
        "configId": "thinking",
        "owned_by": "zai",
        "temperature": 0.7,
        "top_p": 1,
        "thinking": {
            "type": "enabled"
        }
    },
    {
        "id": "glm-4.6",
        "configId": "no-thinking",
        "owned_by": "zai",
        "temperature": 0,
        "top_p": 1,
        "thinking": {
            "type": "disabled"
        }
    }
]
```

## 在 Copilot 中显示思考

某些提供器/模型支持在 Copilot 中显示**思考**块：

### OpenAI Responses
使用 `apiMode: "openai-responses"` 并设置推理摘要模式：
```json
{
    "id": "gpt-4o-mini",
    "owned_by": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiMode": "openai-responses",
    "reasoning_effort": "high",
    "extra": {
        "reasoning": {
            "summary": "detailed"
        }
    }
}
```

### Gemini
使用 `apiMode: "gemini"` 并启用思考摘要：
```json
{
    "id": "gemini-3-flash-preview",
    "owned_by": "gemini",
    "baseUrl": "https://generativelanguage.googleapis.com",
    "apiMode": "gemini",
    "extra": {
        "generationConfig": {
            "thinkingConfig": {
                "includeThoughts": true
            }
        }
    }
}
```

## 模型参数

所有参数支持针对不同模型进行单独配置：

| 参数 | 描述 |
|------|------|
| `id` | 模型标识符（必需） |
| `owned_by` | 模型提供器（必需） |
| `displayName` | 显示名称 |
| `configId` | 配置 ID |
| `family` | 模型系列 |
| `baseUrl` | 模型特定的基础 URL |
| `context_length` | 支持的上下文长度，默认 128000 |
| `max_tokens` | 生成的最大 token 数，默认 4096 |
| `vision` | 是否支持视觉功能，默认 false |
| `temperature` | 采样温度（范围：[0, 2]），默认 0 |
| `top_p` | Top-p 采样值 |
| `apiMode` | API 模式 |
| `useForCommitGeneration` | 是否用于 Git 提交消息生成 |

## 支持与许可

- 问题反馈: <https://github.com/JohnnyZ93/oai-compatible-copilot/issues>
- 许可证: MIT License

## 致谢

感谢所有贡献者：
- [贡献者](https://github.com/JohnnyZ93/oai-compatible-copilot/graphs/contributors)
- [Hugging Face Chat Extension](https://github.com/huggingface/huggingface-vscode-chat)
- [VS Code Chat Provider API](https://code.visualstudio.com/api/extension-guides/ai/language-model-chat-provider)
