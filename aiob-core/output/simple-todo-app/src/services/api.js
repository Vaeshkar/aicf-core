import axios from 'axios';

const API_BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

export const todoApi = {
  async getAllTodos() {
    try {
      const response = await api.get('/todos');
      return response.data;
    } catch (error) {
      throw new Error('Failed to fetch todos');
    }
  },

  async addTodo(text) {
    try {
      const response = await api.post('/todos', { text });
      return response.data;
    } catch (error) {
      throw new Error('Failed to add todo');
    }
  },

  async toggleTodo(id, completed) {
    try {
      const response = await api.put(`/todos/${id}`, { completed });
      return response.data;
    } catch (error) {
      throw new Error('Failed to update todo');
    }
  },

  async deleteTodo(id) {
    try {
      await api.delete(`/todos/${id}`);
    } catch (error) {
      throw new Error('Failed to delete todo');
    }
  }
};