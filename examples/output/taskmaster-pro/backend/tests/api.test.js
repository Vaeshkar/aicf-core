const request = require('supertest');
const app = require('../server');

describe('API Endpoints', () => {
  test('GET /api/records should return all records', async () => {
    const response = await request(app).get('/api/records');
    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.body)).toBeTruthy();
  });

  test('GET /api/records/:id should return specific record', async () => {
    const response = await request(app).get('/api/records/1');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('id');
  });

  test('POST /api/records should create new record', async () => {
    const newRecord = {
      title: 'Test Record',
      description: 'Test Description'
    };
    const response = await request(app)
      .post('/api/records')
      .send(newRecord);
    expect(response.statusCode).toBe(201);
    expect(response.body).toHaveProperty('id');
  });
});
```

2. Let's create a frontend integration test file: