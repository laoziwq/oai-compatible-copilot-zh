import * as path from "path";
import * as vscode from "vscode";
import { getGitDiff } from "./gitUtils";
import { OpenaiApi } from "../openai/openaiApi";
import { OpenaiResponsesApi } from "../openai/openaiResponsesApi";
import { AnthropicApi } from "../anthropic/anthropicApi";
import { OllamaApi } from "../ollama/ollamaApi";
import { normalizeUserModels } from "../utils";
import { logger } from "../logger";
import type { HFModelItem } from "../types";

/**
 * Git 提交消息生成器模块
 */

let commitGenerationAbortController: AbortController | undefined;

const DEFAULT_PROMPT = {
	system:
		"你是一个有用的助手，根据 git diff 输出生成信息丰富的 git 提交消息。跳过前言并移除提交消息周围的所有反引号。\n根据提供的 git diff，生成规范格式的提交消息。",
	user: "开发者的备注（如不相关请忽略）：{{USER_CURRENT_INPUT}}",
};

export async function generateCommitMsg(secrets: vscode.SecretStorage, scm?: vscode.SourceControl) {
	try {
		const gitExtension = vscode.extensions.getExtension("vscode.git")?.exports;
		if (!gitExtension) {
			throw new Error("未找到 Git 扩展");
		}

		const git = gitExtension.getAPI(1);
		if (git.repositories.length === 0) {
			throw new Error("没有可用的 Git 仓库");
		}

		// If scm is provided, then the user specified one repository by clicking the "Source Control" menu button
		if (scm) {
			const repository = git.getRepository(scm.rootUri);

			if (!repository) {
				throw new Error("未找到提供的 SCM 对应的仓库");
			}

			await generateCommitMsgForRepository(secrets, repository);
			return;
		}

		await orchestrateWorkspaceCommitMsgGeneration(secrets, git.repositories);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		vscode.window.showErrorMessage(`[提交消息生成失败] ${errorMessage}`);
	}
}

async function orchestrateWorkspaceCommitMsgGeneration(secrets: vscode.SecretStorage, repos: any[]) {
	const reposWithChanges = await filterForReposWithChanges(repos);

	if (reposWithChanges.length === 0) {
		vscode.window.showInformationMessage(`工作区仓库中未发现更改。`);
		return;
	}

	if (reposWithChanges.length === 1) {
		// Only one repo with changes, generate for it
		const repo = reposWithChanges[0];
		await generateCommitMsgForRepository(secrets, repo);
		return;
	}

	const selection = await promptRepoSelection(reposWithChanges);

	if (!selection) {
		// User cancelled
		return;
	}

	if (selection.repo === null) {
		// Generate for all repositories with changes
		for (const repo of reposWithChanges) {
			try {
				await generateCommitMsgForRepository(secrets, repo);
			} catch (error) {
				console.error(`无法为 ${repo.rootUri.fsPath} 生成提交消息:`, error);
			}
		}
	} else {
		// Generate for selected repository
		await generateCommitMsgForRepository(secrets, selection.repo);
	}
}

async function filterForReposWithChanges(repos: any[]) {
	const reposWithChanges = [];

	// Check which repositories have changes
	for (const repo of repos) {
		try {
			const gitDiff = await getGitDiff(repo.rootUri.fsPath);
			if (gitDiff) {
				reposWithChanges.push(repo);
			}
		} catch (error) {
			// Skip repositories with errors (no changes, etc.)
		}
	}
	return reposWithChanges;
}

async function promptRepoSelection(repos: any[]) {
	// Multiple repos with changes - ask user to choose
	const repoItems = repos.map((repo) => ({
		label: repo.rootUri.fsPath.split(path.sep).pop() || repo.rootUri.fsPath,
		description: repo.rootUri.fsPath,
		repo: repo,
	}));

	repoItems.unshift({
		label: "$(git-commit) 为所有有更改的仓库生成",
		description: `为 ${repos.length} 个仓库生成提交消息`,
		repo: null as any,
	});

	return await vscode.window.showQuickPick(repoItems, {
		placeHolder: "选择要生成提交消息的仓库",
	});
}

async function generateCommitMsgForRepository(secrets: vscode.SecretStorage, repository: any) {
	const inputBox = repository.inputBox;
	const repoPath = repository.rootUri.fsPath;
	const gitDiff = await getGitDiff(repoPath);

	if (!gitDiff) {
		throw new Error(`仓库 ${repoPath.split(path.sep).pop() || "repository"} 中没有可生成提交消息的更改`);
	}

	await vscode.window.withProgress(
		{
			location: vscode.ProgressLocation.SourceControl,
			title: `正在为 ${repoPath.split(path.sep).pop() || "仓库"} 生成提交消息...`,
			cancellable: true,
		},
		() => performCommitMsgGeneration(secrets, gitDiff, inputBox)
	);
}

async function performCommitMsgGeneration(secrets: vscode.SecretStorage, gitDiff: string, inputBox: any) {
	const startTime = Date.now();
	let modelId: string | undefined;
	try {
		vscode.commands.executeCommand("setContext", "oaicopilot.isGeneratingCommit", true);
		const config = vscode.workspace.getConfiguration();

		// Get custom prompts or use defaults
		const customSystemPrompt = config.get<string>("oaicopilot.commitMessagePrompt", "");
		const PROMPT = {
			system: customSystemPrompt || DEFAULT_PROMPT.system,
			user: DEFAULT_PROMPT.user,
		};

		const prompts: string[] = [];

		const currentInput = inputBox.value?.trim() || "";
		if (currentInput) {
			prompts.push(PROMPT.user.replace("{{USER_CURRENT_INPUT}}", currentInput));
		}

		const truncatedDiff =
			gitDiff.length > 5000 ? gitDiff.substring(0, 5000) + "\n\n[Diff 因大小被截断]" : gitDiff;
		prompts.push(truncatedDiff);
		const prompt = prompts.join("\n\n");

		// Get user models from configuration
		const userModels = normalizeUserModels(config.get<unknown>("oaicopilot.models", []));

		// Filter models that are marked for commit generation
		const commitModels = userModels.filter((model: HFModelItem) => model.useForCommitGeneration === true);

		if (commitModels.length === 0) {
			throw new Error(
				"没有配置用于提交消息生成的模型。请在配置中将至少一个模型的 'useForCommitGeneration' 设置为 true。"
			);
		}

		// Use the first model marked for commit generation
		const selectedModel = commitModels[0];
		modelId = selectedModel.id;
		logger.info("commit.start", { modelId });

		// Get API key for the model's provider
		const apiKey = await ensureApiKey(secrets, selectedModel.owned_by);
		if (!apiKey) {
			throw new Error("未找到 OAI 兼容 API 密钥");
		}

		// Get base URL for the model
		const baseUrl = selectedModel.baseUrl || config.get<string>("oaicopilot.baseUrl", "");
		if (!baseUrl || !baseUrl.startsWith("http")) {
			throw new Error(`无效的基础 URL 配置。`);
		}

		// Get commit language configuration
		const commitLanguage = config.get<string>("oaicopilot.commitLanguage", "English");

		// Create a system prompt with language instruction
		const systemPrompt = PROMPT.system + ` 用${commitLanguage}生成提交消息。`;

		// Create a message for the API
		const messages = [{ role: "user", content: prompt }];

		// Create API instance based on model's API mode
		let apiInstance;
		const apiMode = selectedModel.apiMode ?? "openai";

		if (apiMode === "anthropic") {
			apiInstance = new AnthropicApi(modelId);
		} else if (apiMode === "ollama") {
			apiInstance = new OllamaApi(modelId);
		} else if (apiMode === "openai-responses") {
			apiInstance = new OpenaiResponsesApi(modelId);
		} else {
			// Default to OpenAI-compatible API
			apiInstance = new OpenaiApi(modelId);
		}

		commitGenerationAbortController = new AbortController();
		const stream = apiInstance.createMessage(selectedModel, systemPrompt, messages, baseUrl, apiKey);

		let response = "";
		for await (const chunk of stream) {
			commitGenerationAbortController.signal.throwIfAborted();
			if (chunk.type === "text") {
				response += chunk.text;
				inputBox.value = extractCommitMessage(response);
			}
		}

		inputBox.value = removeThinkTags(inputBox.value);

		if (!inputBox.value) {
			throw new Error("API 响应为空");
		}

		logger.info("commit.end", { modelId, durationMs: Date.now() - startTime });
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		logger.error("commit.error", { modelId: modelId ?? "unknown", error: errorMessage });
		vscode.window.showErrorMessage(`生成提交消息失败：${errorMessage}`);
	} finally {
		vscode.commands.executeCommand("setContext", "oaicopilot.isGeneratingCommit", false);
	}
}

export function abortCommitGeneration() {
	commitGenerationAbortController?.abort();
	vscode.commands.executeCommand("setContext", "oaicopilot.isGeneratingCommit", false);
}

/**
 * Extracts the commit message from the AI response
 * @param str String containing the AI response
 * @returns The extracted commit message
 */
function extractCommitMessage(str: string): string {
	// Remove any markdown formatting or extra text
	return str
		.trim()
		.replace(/^```\n?\n?|```$/g, "")
		.trim();
}

function removeThinkTags(text: string): string {
	const regex = /<think>.*?<\/think>/gs;
	return text.replace(regex, "").trim();
}

/**
 * Ensure an API key exists in SecretStorage
 * @param provider provider name to get provider-specific API key.
 */
async function ensureApiKey(secrets: vscode.SecretStorage, provider: string): Promise<string | undefined> {
	let apiKey: string | undefined;
	if (provider && provider.trim() !== "") {
		const normalizedProvider = provider.trim().toLowerCase();
		const providerKey = `oaicopilot.apiKey.${normalizedProvider}`;
		apiKey = await secrets.get(providerKey);
	}

	// Fall back to generic API key
	if (!apiKey) {
		apiKey = await secrets.get("oaicopilot.apiKey");
	}

	return apiKey;
}
