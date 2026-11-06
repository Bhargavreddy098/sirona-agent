export const modelsController = {
  getModels(req, res) {
    res.json({
      data: [
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Google ADK)", provider: "google" },
        { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Google ADK)", provider: "google" },
        { id: "gpt-4o", name: "GPT-4o (OpenAI SDK)", provider: "openai" },
        { id: "gpt-4o-mini", name: "GPT-4o Mini (OpenAI SDK)", provider: "openai" },
        { id: "claude-3-7-sonnet-20250219", name: "Claude 3.7 Sonnet (Anthropic)", provider: "anthropic" },
      ],
    });
  },

  getModelOptions(req, res) {
    res.json({
      models: [
        { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash", default: true },
        { id: "gpt-4o", label: "GPT-4o" },
        { id: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
      ],
      reasoning_efforts: ["low", "medium", "high"],
    });
  },
};

export default modelsController;
