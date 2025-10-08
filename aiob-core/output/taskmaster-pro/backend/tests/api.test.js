const { request, app } = require('./config.test');

describe('Todo API Endpoints', () => {
  test('GET /api/todos should return todos list', async () => {
    const response = await request(app).get('/api/todos');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  test('POST /api/todos should create new todo', async () => {
    const newTodo = { title: 'Test Todo', completed: false };
    const response = await request(app)
      .post('/api/todos')
      .send(newTodo);
    expect(response.statusCode).toBe(201);
    expect(response.body.title).toBe(newTodo.title);
  });

  test('PUT /api/todos/:id should update todo', async () => {
    const response = await request(app)
      .put('/api/todos/1')
      .send({ completed: true });
    expect(response.statusCode).toBe(200);
  });

  test('DELETE /api/todos/:id should delete todo', async () => {
    const response = await request(app).delete('/api/todos/1');
    expect(response.statusCode).toBe(200);
  });
});
```

3. Let's create frontend integration tests: