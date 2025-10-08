const request = require('supertest');
const app = require('../backend/server');

describe('API Endpoints', () => {
  // Test GET /api/tasks
  test('GET /api/tasks should return all tasks', async () => {
    const response = await request(app).get('/api/tasks');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  // Test POST /api/tasks
  test('POST /api/tasks should create a new task', async () => {
    const newTask = {
      title: 'Test Task',
      completed: false
    };
    const response = await request(app)
      .post('/api/tasks')
      .send(newTask);
    expect(response.statusCode).toBe(201);
    expect(response.body.title).toBe(newTask.title);
  });

  // Test error handling
  test('POST /api/tasks should handle invalid data', async () => {
    const invalidTask = {};
    const response = await request(app)
      .post('/api/tasks')
      .send(invalidTask);
    expect(response.statusCode).toBe(400);
  });
});