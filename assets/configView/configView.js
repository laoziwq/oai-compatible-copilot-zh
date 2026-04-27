const vscode = acquireVsCodeApi();
const state = {
	baseUrl: "",
	apiKey: "",
	delay: 0,
	retry: { enabled: true, max_attempts: 3, interval_ms: 1000, status_codes: [429, 500, 502, 503, 504] },
	commitModel: "",
	models: [],
	providerKeys: {},
	providerInfo: {},
};

// Store the action to be performed after confirmation
const pendingConfirmations = new Map();

// Global Configuration elements
let baseUrlInput, apiKeyInput, delayInput, readFileLinesInput;
let retryEnabledInput, maxAttemptsInput, intervalMsInput, statusCodesInput;
let providerTableBody;
let modelTableBody, modelFormSection, modelFormTitle;
let modelIdInput, modelIdDropdown, dropdownContent, dropdownHeader;
let modelProviderInput, modelDisplayNameInput, modelConfigIdInput, modelBaseUrlInput;
let modelFamilyInput, modelContextLengthInput, modelMaxTokensInput, modelVisionInput;
let modelApiModeInput, modelTemperatureInput, modelTopPInput, modelDelayInput;
let modelTopKInput, modelMinPInput, modelFrequencyPenaltyInput, modelPresencePenaltyInput;
let modelRepetitionPenaltyInput, modelReasoningEffortInput, modelEnableThinkingInput;
let modelThinkingBudgetInput, modelIncludeReasoningInput, modelMaxCompletionTokensInput;
let modelReasoningEnabledInput, modelReasoningExcludeInput, modelReasoningEffortORInput;
let modelReasoningMaxTokensInput, modelThinkingTypeInput;
let modelHeadersInput, modelExtraInput;
let saveModelBtn, cancelModelBtn, toggleAdvancedSettingsBtn;
let commitModelInput, commitLanguageInput, advancedSettingsContent;
let modelErrorElement;

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	// Get all DOM elements
	baseUrlInput = document.getElementById("baseUrl");
	apiKeyInput = document.getElementById("apiKey");
	delayInput = document.getElementById("delay");
	readFileLinesInput = document.getElementById("readFileLines");
	retryEnabledInput = document.getElementById("retryEnabled");
	maxAttemptsInput = document.getElementById("maxAttempts");
	intervalMsInput = document.getElementById("intervalMs");
	statusCodesInput = document.getElementById("statusCodes");
	providerTableBody = document.getElementById("providerTableBody");
	modelTableBody = document.getElementById("modelTableBody");
	modelFormSection = document.getElementById("modelFormSection");
	modelFormTitle = document.getElementById("modelFormTitle");
	modelIdInput = document.getElementById("modelIdInput");
	modelIdDropdown = document.getElementById("modelIdDropdown");
	modelProviderInput = document.getElementById("modelProvider");
	modelDisplayNameInput = document.getElementById("modelDisplayName");
	modelConfigIdInput = document.getElementById("modelConfigId");
	modelBaseUrlInput = document.getElementById("modelBaseUrl");
	modelFamilyInput = document.getElementById("modelFamily");
	modelContextLengthInput = document.getElementById("modelContextLength");
	modelMaxTokensInput = document.getElementById("modelMaxTokens");
	modelVisionInput = document.getElementById("modelVision");
	modelApiModeInput = document.getElementById("modelApiMode");
	modelTemperatureInput = document.getElementById("modelTemperature");
	modelTopPInput = document.getElementById("modelTopP");
	modelDelayInput = document.getElementById("modelDelay");
	modelTopKInput = document.getElementById("modelTopK");
	modelMinPInput = document.getElementById("modelMinP");
	modelFrequencyPenaltyInput = document.getElementById("modelFrequencyPenalty");
	modelPresencePenaltyInput = document.getElementById("modelPresencePenalty");
	modelRepetitionPenaltyInput = document.getElementById("modelRepetitionPenalty");
	modelReasoningEffortInput = document.getElementById("modelReasoningEffort");
	modelEnableThinkingInput = document.getElementById("modelEnableThinking");
	modelThinkingBudgetInput = document.getElementById("modelThinkingBudget");
	modelIncludeReasoningInput = document.getElementById("modelIncludeReasoning");
	modelMaxCompletionTokensInput = document.getElementById("modelMaxCompletionTokens");
	modelReasoningEnabledInput = document.getElementById("modelReasoningEnabled");
	modelReasoningExcludeInput = document.getElementById("modelReasoningExclude");
	modelReasoningEffortORInput = document.getElementById("modelReasoningEffortOR");
	modelReasoningMaxTokensInput = document.getElementById("modelReasoningMaxTokens");
	modelThinkingTypeInput = document.getElementById("modelThinkingType");
	modelHeadersInput = document.getElementById("modelHeaders");
	modelExtraInput = document.getElementById("modelExtra");
	saveModelBtn = document.getElementById("saveModel");
	cancelModelBtn = document.getElementById("cancelModel");
	toggleAdvancedSettingsBtn = document.getElementById("toggleAdvancedSettings");
	commitModelInput = document.getElementById("commitModel");
	commitLanguageInput = document.getElementById("commitLanguage");
	advancedSettingsContent = document.getElementById("advancedSettingsContent");
	modelErrorElement = document.getElementById("modelError");

	// Dropdown elements
	if (modelIdDropdown) {
		dropdownContent = modelIdDropdown.querySelector(".dropdown-content");
		dropdownHeader = modelIdDropdown.querySelector(".dropdown-header");
	}

	// Initialize event listeners
	initEventListeners();
	initDropdownEvents();
});

// Initialize all event listeners
function initEventListeners() {
	// Global Configuration save button
	document.getElementById("saveBase")?.addEventListener("click", () => {
		const retry = {
			enabled: retryEnabledInput?.checked ?? true,
			max_attempts: parseInt(maxAttemptsInput?.value) || 3,
			interval_ms: parseInt(intervalMsInput?.value) || 1000,
			status_codes: statusCodesInput?.value
				? statusCodesInput.value.split(",").map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
				: [],
		};

		vscode.postMessage({
			type: "saveGlobalConfig",
			baseUrl: baseUrlInput?.value || "",
			apiKey: apiKeyInput?.value || "",
			delay: parseInt(delayInput?.value) || 0,
			readFileLines: parseInt(readFileLinesInput?.value) || 0,
			retry: retry,
			commitModel: commitModelInput?.value || "",
			commitLanguage: commitLanguageInput?.value || "English",
		});
	});

	// Refresh handler
	const handleRefresh = () => {
		if (modelFormSection && modelFormSection.style.display !== "none") {
			modelFormSection.style.display = "none";
			resetModelForm();
		}
		vscode.postMessage({ type: "requestInit" });
	};

	// Export and Import buttons
	document.getElementById("exportConfig")?.addEventListener("click", () => {
		vscode.postMessage({ type: "exportConfig" });
	});

	document.getElementById("importConfig")?.addEventListener("click", () => {
		vscode.postMessage({ type: "importConfig" });
	});

	// Refresh buttons
	document.getElementById("refreshGlobalConfig")?.addEventListener("click", handleRefresh);
	document.getElementById("refreshProviders")?.addEventListener("click", handleRefresh);
	document.getElementById("refreshModels")?.addEventListener("click", handleRefresh);

	// Add Provider button
	document.getElementById("addProvider")?.addEventListener("click", () => {
		if (!providerTableBody) return;
		
		const newRow = document.createElement("tr");
		newRow.innerHTML = `
			<td><input type="text" class="provider-input" data-field="provider" placeholder="提供器 ID" /></td>
			<td><input type="text" class="provider-input" data-field="baseUrl" placeholder="基础 URL" /></td>
			<td><input type="password" class="provider-input" data-field="apiKey" placeholder="API 密钥" /></td>
			<td>
				<select class="provider-input" data-field="apiMode">
					<option value="openai">OpenAI</option>
					<option value="openai-responses">OpenAI Responses</option>
					<option value="ollama">Ollama</option>
					<option value="anthropic">Anthropic</option>
					<option value="gemini">Gemini</option>
				</select>
			</td>
			<td><textarea class="provider-input" data-field="headers" rows="2" placeholder='{"X-API-Version": "v1"}' style="width: 100%; font-family: monospace; font-size: 12px;"></textarea></td>
			<td>
				<button class="save-provider-btn secondary">保存</button>
				<button class="cancel-provider-btn secondary">取消</button>
			</td>
		`;
		providerTableBody.appendChild(newRow);

		const saveBtn = newRow.querySelector(".save-provider-btn");
		const cancelBtn = newRow.querySelector(".cancel-provider-btn");

		saveBtn?.addEventListener("click", () => {
			const inputs = newRow.querySelectorAll(".provider-input");
			const providerData = {};
			inputs.forEach((input) => {
				const field = input.getAttribute("data-field");
				providerData[field] = input.value;
			});

			let headers = undefined;
			if (providerData.headers && providerData.headers.trim()) {
				try {
					headers = JSON.parse(providerData.headers);
				} catch (e) {
					// ignore invalid JSON
				}
			}

			vscode.postMessage({
				type: "addProvider",
				provider: providerData.provider,
				baseUrl: providerData.baseUrl || undefined,
				apiKey: providerData.apiKey || undefined,
				apiMode: providerData.apiMode || undefined,
				headers: headers,
			});

			newRow.remove();
		});

		cancelBtn?.addEventListener("click", () => {
			newRow.remove();
		});
	});

	// Add Model button
	document.getElementById("addModel")?.addEventListener("click", () => {
		if (modelFormSection) {
			modelFormSection.style.display = "block";
			if (modelFormTitle) modelFormTitle.textContent = "添加新模型";
			resetModelForm();
		}
	});

	// Provider dropdown change
	modelProviderInput?.addEventListener("change", () => {
		const selectedProvider = modelProviderInput.value;
		if (selectedProvider && state.providerInfo[selectedProvider]) {
			if (modelBaseUrlInput) modelBaseUrlInput.value = state.providerInfo[selectedProvider].baseUrl || "";
			if (modelApiModeInput) modelApiModeInput.value = state.providerInfo[selectedProvider].apiMode || "openai";

			const headers = state.providerInfo[selectedProvider].headers;
			if (modelHeadersInput) modelHeadersInput.value = headers ? JSON.stringify(headers, null, 2) : "";

			vscode.postMessage({
				type: "fetchModels",
				baseUrl: state.providerInfo[selectedProvider].baseUrl || state.baseUrl,
				apiKey: state.providerKeys[selectedProvider] || state.apiKey,
				apiMode: state.providerInfo[selectedProvider].apiMode || "openai",
				headers,
			});
		}
	});

	// Toggle advanced settings
	toggleAdvancedSettingsBtn?.addEventListener("click", () => {
		if (!advancedSettingsContent) return;
		const isCurrentlyVisible = advancedSettingsContent.style.display !== "none";
		advancedSettingsContent.style.display = isCurrentlyVisible ? "none" : "block";
		if (toggleAdvancedSettingsBtn) {
			toggleAdvancedSettingsBtn.textContent = isCurrentlyVisible ? "显示高级设置" : "隐藏高级设置";
		}
	});

	// Save Model button
	saveModelBtn?.addEventListener("click", () => {
		const modelData = collectModelFormData();
		if (!validateModelData(modelData)) return;

		const isEditing = modelIdInput?.hasAttribute("data-editing");
		if (isEditing) {
			let originalModelId = modelData.originalModelId;
			let originalConfigId = modelData.originalConfigId;
			delete modelData.originalModelId;
			delete modelData.originalConfigId;

			vscode.postMessage({
				type: "updateModel",
				model: modelData,
				originalModelId: originalModelId,
				originalConfigId: originalConfigId,
			});
		} else {
			vscode.postMessage({
				type: "addModel",
				model: modelData,
			});
		}

		if (modelFormSection) modelFormSection.style.display = "none";
		resetModelForm();
	});

	// Cancel Model button
	cancelModelBtn?.addEventListener("click", () => {
		if (modelFormSection) modelFormSection.style.display = "none";
		resetModelForm();
	});
}

// Message handler
window.addEventListener("message", (event) => {
	const message = event.data;

	switch (message.type) {
		case "init":
			const { baseUrl, apiKey, delay, readFileLines, retry, commitModel, models, providerKeys, commitLanguage } =
				message.payload;
			state.baseUrl = baseUrl || "";
			state.apiKey = apiKey || "";
			state.delay = delay || 0;
			state.readFileLines = readFileLines || 0;
			state.retry = retry || { enabled: true, max_attempts: 3, interval_ms: 1000, status_codes: [] };
			state.models = models || [];
			state.commitModel = commitModel || "";
			state.providerKeys = providerKeys || {};

			if (baseUrlInput) baseUrlInput.value = baseUrl || "";
			if (apiKeyInput) apiKeyInput.value = apiKey || "";
			if (delayInput) delayInput.value = state.delay;
			if (readFileLinesInput) readFileLinesInput.value = readFileLines || 0;
			if (retryEnabledInput) retryEnabledInput.checked = state.retry.enabled !== false;
			if (maxAttemptsInput) maxAttemptsInput.value = state.retry.max_attempts || 3;
			if (intervalMsInput) intervalMsInput.value = state.retry.interval_ms || 1000;
			if (statusCodesInput) statusCodesInput.value = state.retry.status_codes ? state.retry.status_codes.join(",") : "";

			populateCommitModelDropdown();
			if (commitModelInput) commitModelInput.value = state.commitModel || "";
			if (commitLanguageInput) commitLanguageInput.value = commitLanguage || "English";

			renderProviders();
			renderModels();
			break;

		case "modelsFetched":
			populateModelIdDropdown(message.models);
			break;

		case "modelsFetchError":
			console.error("Failed to fetch models:", message.error);
			break;

		case "confirmResponse":
			const pending = pendingConfirmations.get(message.id);
			if (pending && message.confirmed) {
				pending.action();
			}
			pendingConfirmations.delete(message.id);
			break;
	}
});

function renderProviders() {
	if (!providerTableBody) return;

	const providers = Array.from(new Set(state.models.map((m) => m.owned_by).filter(Boolean))).sort();

	if (!providers.length) {
		providerTableBody.innerHTML = '<tr><td colspan="6" class="no-data">无提供器</td></tr>';
		return;
	}

	const rows = providers.map((provider) => {
		const providerModels = state.models.filter((m) => m.owned_by === provider);
		const firstModel = providerModels[0] || {};

		state.providerInfo[provider] = {
			baseUrl: firstModel.baseUrl || state.baseUrl,
			apiMode: firstModel.apiMode || "openai",
			apiKey: state.providerKeys[provider] || state.apiKey,
			headers: firstModel.headers,
		};

		const apiKeyDisplay = state.providerKeys[provider] ? "••••••••" : "未设置";
		const headersDisplay = firstModel.headers ? JSON.stringify(firstModel.headers) : "";

		return `
			<tr data-provider="${provider}">
				<td>${provider}</td>
				<td><input type="text" class="provider-input" data-field="baseUrl" value="${firstModel.baseUrl || ""}" placeholder="基础 URL" /></td>
				<td><input type="password" class="provider-input" data-field="apiKey" value="${state.providerKeys[provider] || ""}" placeholder="API 密钥" /></td>
				<td>
					<select class="provider-input" data-field="apiMode">
						<option value="openai" ${firstModel.apiMode === "openai" ? "selected" : ""}>OpenAI</option>
						<option value="openai-responses" ${firstModel.apiMode === "openai-responses" ? "selected" : ""}>OpenAI Responses</option>
						<option value="ollama" ${firstModel.apiMode === "ollama" ? "selected" : ""}>Ollama</option>
						<option value="anthropic" ${firstModel.apiMode === "anthropic" ? "selected" : ""}>Anthropic</option>
						<option value="gemini" ${firstModel.apiMode === "gemini" ? "selected" : ""}>Gemini</option>
					</select>
				</td>
				<td><textarea class="provider-input" data-field="headers" rows="2" placeholder='{"X-API-Version": "v1"}' style="width: 100%; font-family: monospace; font-size: 12px;">${headersDisplay}</textarea></td>
				<td class="action-buttons">
					<button class="update-provider-btn" data-provider="${provider}">更新</button>
					<button class="delete-provider-btn danger" data-provider="${provider}">删除</button>
				</td>
			</tr>`;
	}).join("");

	providerTableBody.innerHTML = rows;

	// Update provider buttons
	document.querySelectorAll(".update-provider-btn").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			const provider = event.target.getAttribute("data-provider");
			const row = event.target.closest("tr");
			const inputs = row.querySelectorAll(".provider-input");
			const providerData = {};
			inputs.forEach((input) => {
				const field = input.getAttribute("data-field");
				providerData[field] = input.value;
			});

			let headers = undefined;
			if (providerData.headers && providerData.headers.trim()) {
				try {
					headers = JSON.parse(providerData.headers);
				} catch (e) {}
			}

			vscode.postMessage({
				type: "updateProvider",
				provider: provider,
				baseUrl: providerData.baseUrl || undefined,
				apiKey: providerData.apiKey || undefined,
				apiMode: providerData.apiMode || undefined,
				headers: headers,
			});
		});
	});

	document.querySelectorAll(".delete-provider-btn").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			const provider = event.target.getAttribute("data-provider");
			const confirmId = "deleteProvider_" + Date.now();

			pendingConfirmations.set(confirmId, {
				action: () => vscode.postMessage({ type: "deleteProvider", provider: provider }),
			});

			vscode.postMessage({
				type: "requestConfirm",
				id: confirmId,
				message: `确定要删除提供器 ${provider} 及其所有模型吗？`,
				action: "deleteProvider",
			});
		});
	});

	// Update provider dropdown in model form
	if (modelProviderInput) {
		const providerOptions = providers.map((provider) => `<option value="${provider}">${provider}</option>`).join("");
		modelProviderInput.innerHTML = '<option value="">选择提供器</option>' + providerOptions;
	}
}

function renderModels() {
	if (!modelTableBody) return;

	const models = state.models.filter((m) => !m.id.startsWith("__provider__")).sort((a, b) => a.id.localeCompare(b.id));

	if (!models.length) {
		modelTableBody.innerHTML = '<tr><td colspan="11" class="no-data">无模型</td></tr>';
		return;
	}

	const rows = models.map((model) => {
		return `
			<tr data-model-id="${model.id}${model.configId ? "::" + model.configId : ""}">
				<td>${model.id}</td>
				<td>${model.owned_by}</td>
				<td>${model.displayName || ""}</td>
				<td>${model.configId || ""}</td>
				<td>${model.context_length || ""}</td>
				<td>${model.max_tokens || model.max_completion_tokens || ""}</td>
				<td>${model.vision ? "是" : ""}</td>
				<td>${model.temperature !== undefined && model.temperature !== null ? model.temperature : ""}</td>
				<td>${model.top_p !== undefined && model.top_p !== null ? model.top_p : ""}</td>
				<td>${model.delay || ""}</td>
				<td class="action-buttons">
					<button class="update-model-btn" data-model-id="${model.id}${model.configId ? "::" + model.configId : ""}">编辑</button>
					<button class="delete-model-btn danger" data-model-id="${model.id}${model.configId ? "::" + model.configId : ""}">删除</button>
				</td>
			</tr>`;
	}).join("");

	modelTableBody.innerHTML = rows;

	document.querySelectorAll(".update-model-btn").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			const modelId = event.target.getAttribute("data-model-id");
			const parsedModelId = modelId.includes("::")
				? { baseId: modelId.split("::")[0], configId: modelId.split("::")[1] }
				: { baseId: modelId, configId: null };

			const model = state.models.find(
				(m) =>
					m.id === parsedModelId.baseId &&
					((parsedModelId.configId && m.configId === parsedModelId.configId) || (!parsedModelId.configId && !m.configId))
			);

			if (model && modelFormSection) {
				modelFormSection.style.display = "block";
				if (modelFormTitle) modelFormTitle.textContent = `编辑模型：${modelId}`;
				populateModelForm(model);
			}
		});
	});

	document.querySelectorAll(".delete-model-btn").forEach((btn) => {
		btn.addEventListener("click", (event) => {
			const modelId = event.target.getAttribute("data-model-id");
			const confirmId = "deleteModel_" + Date.now();

			pendingConfirmations.set(confirmId, {
				action: () => vscode.postMessage({ type: "deleteModel", modelId: modelId }),
			});

			vscode.postMessage({
				type: "requestConfirm",
				id: confirmId,
				message: `确定要删除模型 ${modelId} 吗？`,
				action: "deleteModel",
			});
		});
	});
}

function resetModelForm() {
	showModelError("");

	if (modelIdInput) {
		modelIdInput.value = "";
		modelIdInput.removeAttribute("data-editing");
		modelIdInput.removeAttribute("data-original-id");
		modelIdInput.removeAttribute("data-original-configId");
	}
	if (modelProviderInput) modelProviderInput.value = "";
	if (modelDisplayNameInput) modelDisplayNameInput.value = "";
	if (modelConfigIdInput) modelConfigIdInput.value = "";
	if (modelBaseUrlInput) {
		modelBaseUrlInput.value = "";
		modelBaseUrlInput.disabled = false;
	}
	if (modelFamilyInput) modelFamilyInput.value = "";
	if (modelContextLengthInput) modelContextLengthInput.value = "128000";
	if (modelMaxTokensInput) modelMaxTokensInput.value = "4096";
	if (modelVisionInput) modelVisionInput.value = "";
	if (modelApiModeInput) {
		modelApiModeInput.value = "openai";
		modelApiModeInput.disabled = false;
	}
	if (modelTemperatureInput) modelTemperatureInput.value = "0";
	if (modelTopPInput) modelTopPInput.value = "";
	if (modelDelayInput) modelDelayInput.value = "";
	if (modelTopKInput) modelTopKInput.value = "";
	if (modelMinPInput) modelMinPInput.value = "";
	if (modelFrequencyPenaltyInput) modelFrequencyPenaltyInput.value = "";
	if (modelPresencePenaltyInput) modelPresencePenaltyInput.value = "";
	if (modelRepetitionPenaltyInput) modelRepetitionPenaltyInput.value = "";
	if (modelReasoningEffortInput) modelReasoningEffortInput.value = "";
	if (modelEnableThinkingInput) modelEnableThinkingInput.value = "";
	if (modelThinkingBudgetInput) modelThinkingBudgetInput.value = "";
	if (modelIncludeReasoningInput) modelIncludeReasoningInput.value = "";
	if (modelMaxCompletionTokensInput) modelMaxCompletionTokensInput.value = "";
	if (modelReasoningEnabledInput) modelReasoningEnabledInput.value = "";
	if (modelReasoningExcludeInput) modelReasoningExcludeInput.value = "";
	if (modelReasoningEffortORInput) modelReasoningEffortORInput.value = "";
	if (modelReasoningMaxTokensInput) modelReasoningMaxTokensInput.value = "";
	if (modelThinkingTypeInput) modelThinkingTypeInput.value = "";
	if (modelHeadersInput) modelHeadersInput.value = "";
	if (modelExtraInput) modelExtraInput.value = "";
	if (advancedSettingsContent) advancedSettingsContent.style.display = "none";
	if (toggleAdvancedSettingsBtn) toggleAdvancedSettingsBtn.textContent = "显示高级设置";
}

function collectModelFormData() {
	const modelData = {
		id: modelIdInput?.value || "",
		owned_by: modelProviderInput?.value || "",
		displayName: modelDisplayNameInput?.value || undefined,
		configId: modelConfigIdInput?.value || undefined,
		baseUrl: modelBaseUrlInput?.value || undefined,
		family: modelFamilyInput?.value || undefined,
		context_length: modelContextLengthInput?.value ? parseInt(modelContextLengthInput.value) : undefined,
		max_tokens: modelMaxTokensInput?.value ? parseInt(modelMaxTokensInput.value) : undefined,
		vision: modelVisionInput?.value ? modelVisionInput.value === "true" : undefined,
		apiMode: modelApiModeInput?.value || "openai",
		temperature: modelTemperatureInput?.value ? parseFloat(modelTemperatureInput.value) : undefined,
		top_p: modelTopPInput?.value ? parseFloat(modelTopPInput.value) : undefined,
		delay: modelDelayInput?.value ? parseInt(modelDelayInput.value) : undefined,
		top_k: modelTopKInput?.value ? parseInt(modelTopKInput.value) : undefined,
		min_p: modelMinPInput?.value ? parseFloat(modelMinPInput.value) : undefined,
		frequency_penalty: modelFrequencyPenaltyInput?.value ? parseFloat(modelFrequencyPenaltyInput.value) : undefined,
		presence_penalty: modelPresencePenaltyInput?.value ? parseFloat(modelPresencePenaltyInput.value) : undefined,
		repetition_penalty: modelRepetitionPenaltyInput?.value ? parseFloat(modelRepetitionPenaltyInput.value) : undefined,
		reasoning_effort: modelReasoningEffortInput?.value || undefined,
		enable_thinking: modelEnableThinkingInput?.value ? modelEnableThinkingInput.value === "true" : undefined,
		thinking_budget: modelThinkingBudgetInput?.value ? parseInt(modelThinkingBudgetInput.value) : undefined,
		include_reasoning_in_request: modelIncludeReasoningInput?.value ? modelIncludeReasoningInput.value === "true" : undefined,
		max_completion_tokens: modelMaxCompletionTokensInput?.value ? parseInt(modelMaxCompletionTokensInput.value) : undefined,
		thinking: buildThinkingConfig(),
		reasoning: buildReasoningConfig(),
		headers: parseJsonField(modelHeadersInput?.value),
		extra: parseJsonField(modelExtraInput?.value),
	};

	// Store original IDs for update
	if (modelIdInput?.hasAttribute("data-editing")) {
		modelData.originalModelId = modelIdInput.getAttribute("data-original-id");
		modelData.originalConfigId = modelIdInput.getAttribute("data-original-configId");
	}

	// Remove undefined values
	Object.keys(modelData).forEach((key) => modelData[key] === undefined && delete modelData[key]);

	return modelData;
}

function buildReasoningConfig() {
	const enabled = modelReasoningEnabledInput?.value ? modelReasoningEnabledInput.value === "true" : undefined;
	const effort = modelReasoningEffortORInput?.value || undefined;
	const exclude = modelReasoningExcludeInput?.value ? modelReasoningExcludeInput.value === "true" : undefined;
	const maxTokens = modelReasoningMaxTokensInput?.value ? parseInt(modelReasoningMaxTokensInput.value) : undefined;

	if (enabled !== undefined || effort !== undefined || exclude !== undefined || maxTokens !== undefined) {
		return { enabled, effort, exclude, max_tokens: maxTokens };
	}
	return undefined;
}

function buildThinkingConfig() {
	const type = modelThinkingTypeInput?.value || undefined;
	if (type !== undefined) {
		return { type };
	}
	return undefined;
}

function parseJsonField(value) {
	if (!value || value.trim() === "") return undefined;
	try {
		return JSON.parse(value.trim());
	} catch (error) {
		return undefined;
	}
}

function showModelError(message) {
	if (modelErrorElement) {
		modelErrorElement.textContent = message;
		modelErrorElement.style.display = message ? "block" : "none";
		if (message) {
			modelErrorElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}
}

function validateModelData(modelData) {
	showModelError("");

	if (!modelData.id) {
		showModelError("模型 ID 是必需的。");
		return false;
	}
	if (!modelData.owned_by) {
		showModelError("提供器 ID 是必需的。");
		return false;
	}

	const isEditing = modelIdInput?.hasAttribute("data-editing");
	const hasDuplicate = state.models
		.filter((m) => {
			if (isEditing) {
				const isOrigin =
					m.id === modelData.originalModelId &&
					((modelData.originalConfigId && m.configId === modelData.originalConfigId) || (!modelData.originalConfigId && !m.configId));
				return !isOrigin;
			}
			return true;
		})
		.some((m) => {
			return (
				m.id === modelData.id &&
				((modelData.configId && m.configId === modelData.configId) || (!modelData.configId && !m.configId))
			);
		});

	if (hasDuplicate) {
		showModelError(`ID="${modelData.id}"${modelData.configId ? ` 且配置 ID="${modelData.configId}"` : ""} 的模型已存在。模型 ID 和配置 ID 的组合必须唯一。`);
		return false;
	}

	if (modelData.context_length !== undefined && (isNaN(modelData.context_length) || modelData.context_length <= 0)) {
		showModelError("上下文长度必须是正数。");
		return false;
	}
	if (modelData.max_tokens !== undefined && (isNaN(modelData.max_tokens) || modelData.max_tokens <= 0)) {
		showModelError("最大 Token 必须是正数。");
		return false;
	}
	if (modelData.max_completion_tokens !== undefined && (isNaN(modelData.max_completion_tokens) || modelData.max_completion_tokens <= 0)) {
		showModelError("最大完成 Token 必须是正数。");
		return false;
	}
	if (modelData.max_tokens !== undefined && modelData.max_completion_tokens !== undefined) {
		showModelError("不能同时设置 'max_tokens' 和 'max_completion_tokens'。请只使用 'max_completion_tokens'。");
		return false;
	}
	if (modelData.temperature !== undefined && (isNaN(modelData.temperature) || modelData.temperature < 0 || modelData.temperature > 2)) {
		showModelError("温度必须在 0 到 2 之间。");
		return false;
	}
	if (modelData.top_p !== undefined && (isNaN(modelData.top_p) || modelData.top_p < 0 || modelData.top_p > 1)) {
		showModelError("Top P 必须在 0 到 1 之间。");
		return false;
	}
	if (modelData.delay !== undefined && (isNaN(modelData.delay) || modelData.delay < 0)) {
		showModelError("延迟必须是非负数。");
		return false;
	}
	if (modelData.headers && typeof modelData.headers !== "object") {
		showModelError("自定义头必须是有效的 JSON 对象。");
		return false;
	}
	if (modelData.extra && typeof modelData.extra !== "object") {
		showModelError("额外参数必须是有效的 JSON 对象。");
		return false;
	}

	return true;
}

function populateModelIdDropdown(models) {
	if (!dropdownContent || !dropdownHeader) return;

	const modelsArray = Array.from(models || []);
	dropdownContent.innerHTML = "";

	if (!modelsArray.length) {
		dropdownHeader.textContent = "无可用模型";
		return;
	}

	dropdownHeader.textContent = `选择模型（${modelsArray.length} 个可用）`;

	modelsArray.forEach((model) => {
		const option = document.createElement("div");
		option.className = "dropdown-option";
		option.textContent = model.id;
		option.dataset.modelId = model.id;

		option.addEventListener("click", () => {
			if (modelIdInput) modelIdInput.value = model.id;
			hideDropdown();
			dropdownContent.querySelectorAll(".dropdown-option").forEach((opt) => opt.classList.remove("selected"));
			option.classList.add("selected");
		});

		dropdownContent.appendChild(option);
	});
}

function populateCommitModelDropdown() {
	if (!commitModelInput) return;

	while (commitModelInput.children.length > 1) {
		commitModelInput.removeChild(commitModelInput.lastChild);
	}

	const commitCompatibleModels = state.models
		.filter((model) => {
			const apiMode = model.apiMode || "openai";
			return apiMode !== "gemini" && !model.id.startsWith("__provider__");
		})
		.sort((a, b) => a.id.localeCompare(b.id));

	commitCompatibleModels.forEach((model) => {
		const option = document.createElement("option");
		const fullModelId = `${model.id}${model.configId ? "::" + model.configId : ""}`;
		option.value = fullModelId;
		option.textContent = model.displayName || fullModelId;
		commitModelInput.appendChild(option);
	});
}

function showDropdown() {
	if (dropdownContent && dropdownContent.children.length > 0 && modelIdDropdown) {
		modelIdDropdown.classList.add("show");
	}
}

function hideDropdown() {
	if (modelIdDropdown) modelIdDropdown.classList.remove("show");
}

function initDropdownEvents() {
	if (!modelIdInput || !modelIdDropdown) return;

	modelIdInput.addEventListener("focus", () => {
		if (dropdownContent && dropdownContent.children.length > 0) {
			showDropdown();
		}
	});

	document.addEventListener("click", (event) => {
		if (!modelIdDropdown.contains(event.target) && event.target !== modelIdInput) {
			hideDropdown();
		}
	});

	modelIdInput.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			hideDropdown();
		} else if (event.key === "ArrowDown" && modelIdDropdown.classList.contains("show")) {
			event.preventDefault();
			if (dropdownContent) {
				const options = dropdownContent.querySelectorAll(".dropdown-option");
				if (options.length > 0) {
					options[0].focus();
					options[0].classList.add("selected");
				}
			}
		}
	});

	modelIdInput.addEventListener("input", () => {
		if (!dropdownContent || !dropdownHeader) return;

		dropdownContent.querySelectorAll(".dropdown-option").forEach((opt) => opt.classList.remove("selected"));

		const searchTerm = modelIdInput.value.toLowerCase();
		dropdownContent.querySelectorAll(".dropdown-option").forEach((option) => {
			const modelId = option.dataset.modelId.toLowerCase();
			option.style.display = modelId.includes(searchTerm) ? "block" : "none";
		});

		const visibleCount = Array.from(dropdownContent.querySelectorAll(".dropdown-option")).filter((opt) => opt.style.display !== "none").length;
		dropdownHeader.textContent = `选择模型（${visibleCount} 个匹配）`;
	});
}

function populateModelForm(model) {
	showModelError("");

	if (modelIdInput) {
		modelIdInput.setAttribute("data-original-id", model.id || "");
		modelIdInput.setAttribute("data-original-configId", model.configId || "");
		modelIdInput.value = model.id || "";
		modelIdInput.setAttribute("data-editing", "true");
	}

	// Ensure provider in dropdown
	const currentProvider = model.owned_by || "";
	if (modelProviderInput) {
		const providerExists = Array.from(modelProviderInput.options).some((option) => option.value === currentProvider);
		if (!providerExists && currentProvider) {
			const newOption = document.createElement("option");
			newOption.value = currentProvider;
			newOption.textContent = currentProvider;
			modelProviderInput.appendChild(newOption);
		}
		modelProviderInput.value = currentProvider;
	}

	// Fetch models for this provider
	const providerInfo = state.providerInfo[currentProvider];
	vscode.postMessage({
		type: "fetchModels",
		baseUrl: model.baseUrl || state.baseUrl,
		apiKey: state.providerKeys[currentProvider] || state.apiKey,
		apiMode: providerInfo?.apiMode || model.apiMode || "openai",
		headers: model.headers,
	});

	if (modelDisplayNameInput) modelDisplayNameInput.value = model.displayName || "";
	if (modelConfigIdInput) modelConfigIdInput.value = model.configId || "";
	if (modelBaseUrlInput) {
		modelBaseUrlInput.value = model.baseUrl || "";
		modelBaseUrlInput.disabled = true;
	}
	if (modelFamilyInput) modelFamilyInput.value = model.family || "";
	if (modelContextLengthInput) modelContextLengthInput.value = model.context_length || "";
	if (modelMaxTokensInput) modelMaxTokensInput.value = model.max_tokens || "";
	if (modelVisionInput) modelVisionInput.value = model.vision !== undefined ? String(model.vision) : "";
	if (modelApiModeInput) {
		modelApiModeInput.value = model.apiMode || "openai";
		modelApiModeInput.disabled = true;
	}
	if (modelTemperatureInput) modelTemperatureInput.value = model.temperature !== undefined && model.temperature !== null ? model.temperature : "";
	if (modelTopPInput) modelTopPInput.value = model.top_p !== undefined && model.top_p !== null ? model.top_p : "";
	if (modelDelayInput) modelDelayInput.value = model.delay || "";
	if (modelTopKInput) modelTopKInput.value = model.top_k || "";
	if (modelMinPInput) modelMinPInput.value = model.min_p || "";
	if (modelFrequencyPenaltyInput) modelFrequencyPenaltyInput.value = model.frequency_penalty || "";
	if (modelPresencePenaltyInput) modelPresencePenaltyInput.value = model.presence_penalty || "";
	if (modelRepetitionPenaltyInput) modelRepetitionPenaltyInput.value = model.repetition_penalty || "";
	if (modelReasoningEffortInput) modelReasoningEffortInput.value = model.reasoning_effort || "";
	if (modelEnableThinkingInput) modelEnableThinkingInput.value = model.enable_thinking !== undefined ? String(model.enable_thinking) : "";
	if (modelThinkingBudgetInput) modelThinkingBudgetInput.value = model.thinking_budget || "";
	if (modelIncludeReasoningInput) modelIncludeReasoningInput.value = model.include_reasoning_in_request !== undefined ? String(model.include_reasoning_in_request) : "";
	if (modelMaxCompletionTokensInput) modelMaxCompletionTokensInput.value = model.max_completion_tokens || "";

	if (model.reasoning) {
		if (modelReasoningEnabledInput) modelReasoningEnabledInput.value = model.reasoning.enabled !== undefined ? String(model.reasoning.enabled) : "";
		if (modelReasoningEffortORInput) modelReasoningEffortORInput.value = model.reasoning.effort || "";
		if (modelReasoningExcludeInput) modelReasoningExcludeInput.value = model.reasoning.exclude !== undefined ? String(model.reasoning.exclude) : "";
		if (modelReasoningMaxTokensInput) modelReasoningMaxTokensInput.value = model.reasoning.max_tokens || "";
	}
	if (model.thinking && modelThinkingTypeInput) {
		modelThinkingTypeInput.value = model.thinking.type || "";
	}
	if (modelHeadersInput) modelHeadersInput.value = model.headers ? JSON.stringify(model.headers, null, 2) : "";
	if (modelExtraInput) modelExtraInput.value = model.extra ? JSON.stringify(model.extra, null, 2) : "";
}
