import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const TodoAPI = {
  async getAllTodos() {
    try {
      const response = await api.get('/todos');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch todos: ' + error.message);
    }
  },

  async createTodo(todoData) {
    try {
      const response = await api.post('/todos', todoData);
      return response.data;
    } catch (error) {
      throw new Error('Failed to create todo: ' + error.message);
    }
  },

  async updateTodo(id, updates) {
    try {
      const response = await api.patch(`/todos/${id}`, updates);
      return response.data;
    } catch (error) {
      throw new Error('Failed to update todo: ' + error.message);
    }
  },

  async deleteTodo(id) {
    try {
      const response = await api.delete(`/todos/${id}`);
      return response.data;
    } catch (error) {
      throw new Error('Failed to delete todo: ' + error.message);
    }
  }
};