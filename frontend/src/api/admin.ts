// frontend/src/api/admin.ts
const API_BASE = "https://sturdy-space-enigma-x54x9jrq74wx26jwv-5000.app.github.dev/api";

export const getModels = async (token: string) => {
  try {
    const response = await fetch(`${API_BASE}/admin/models`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (response.status === 401) {
      throw new Error('Authentication failed - please login again');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

export const addModel = async (modelName: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE}/admin/models`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ model_name: modelName })
    });

    if (response.status === 401) {
      throw new Error('Authentication failed - please login again');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Add Model API Error:', error);
    throw error;
  }
};

export const deleteModel = async (modelName: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE}/admin/models/${encodeURIComponent(modelName)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      throw new Error('Authentication failed - please login again');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete Model API Error:', error);
    throw error;
  }
};

// User Management APIs
export const getUsers = async (token: string) => {
  try {
    const response = await fetch(`${API_BASE}/admin/users`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    if (response.status === 401) {
      throw new Error('Authentication failed - please login again');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Get Users API Error:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: { name: string; role: string }, token: string) => {
  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(userData)
    });

    if (response.status === 401) {
      throw new Error('Authentication failed - please login again');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Update User API Error:', error);
    throw error;
  }
};

export const deleteUser = async (userId: string, token: string) => {
  try {
    const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      throw new Error('Authentication failed - please login again');
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Delete User API Error:', error);
    throw error;
  }
};