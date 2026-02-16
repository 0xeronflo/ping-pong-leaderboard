const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Helper function for API calls
async function apiCall(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Send cookies with requests
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Players API
export const playersApi = {
  getAll: () => apiCall('/players'),
  getById: (id) => apiCall(`/players/${id}`),
  getStats: (id) => apiCall(`/players/${id}/stats`),
  getEloHistory: (id) => apiCall(`/players/${id}/elo-history`),
  create: (name) => apiCall('/players', {
    method: 'POST',
    body: JSON.stringify({ name }),
  }),
};

// Games API
export const gamesApi = {
  getAll: (limit = 50, offset = 0) => apiCall(`/games?limit=${limit}&offset=${offset}`),
  getById: (id) => apiCall(`/games/${id}`),
  create: (gameData) => apiCall('/games', {
    method: 'POST',
    body: JSON.stringify(gameData),
  }),
};
