import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response.data,
  error => {
    const message = error.response?.data?.message || 'An unexpected error occurred';
    return Promise.reject(message);
  }
);

export const todosApi = {
  getAll: () => api.get('/todos'),
  create: (text: string, priority: string) => api.post('/todos', { text, priority }),
  update: (id: number, updates: Partial<TodoItem>) => api.patch(`/todos/${id}`, updates),
  delete: (id: number) => api.delete(`/todos/${id}`)
};