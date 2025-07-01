// frontend/src/api/ai.ts
const API_BASE_URL = 'https://sturdy-space-enigma-x54x9jrq74wx26jwv-5000.app.github.dev/api'


// ✅ Fetch available models from backend
export const fetchModels = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/ml/available-models`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const models = await response.json();
    console.log("📦 Models fetched successfully:", models);
    return Array.isArray(models) ? models : [];
    
  } catch (error) {
    console.error("❌ Error fetching models:", error);
    throw error;
  }
};

// ✅ Classify GitHub issue comments
export const classifyIssue = async (data: {
  modelName: string;
  issueUrl: string;
}) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ml/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: data.modelName,        // ✅ Backend expects 'model'
        github_url: data.issueUrl,    // ✅ Backend expects 'github_url'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("📊 Classification result:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Error classifying issue:", error);
    throw error;
  }
};

// ✅ Save classification history
export const saveClassificationHistory = async (
  historyData: {
    model_name: string;
    issue_url: string;
    issue_title: string;
    issue_number: string;
    source_type: string;
    result_json: any[];
  },
  token: string
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/ml/save-history`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
      },
      body: JSON.stringify(historyData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("💾 History saved successfully:", result);
    return result;
    
  } catch (error) {
    console.error("❌ Error saving history:", error);
    throw error;
  }
};