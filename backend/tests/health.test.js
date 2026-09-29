const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');

describe('API Foundation & Health Check Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  describe('GET /', () => {
    it('should return welcome message and documentation link with 200 OK', async () => {
      const res = await request(app).get('/');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body).toHaveProperty('message');
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.version).toBe('1.0.0');
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 OK and valid health payload', async () => {
      const res = await request(app).get('/api/health');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('success', true);
      expect(res.body.data).toHaveProperty('status', 'ok');
      expect(res.body.data).toHaveProperty('uptime');
      expect(res.body.data).toHaveProperty('timestamp');
      expect(res.body.data).toHaveProperty('database');
      expect(res.body.data.database).toHaveProperty('status');
    });
  });

  describe('Error Handling Middleware', () => {
    it('should return standard 404 response for undefined routes', async () => {
      const res = await request(app).get('/api/undefined-endpoint-xyz');

      expect(res.statusCode).toBe(404);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('message');
      expect(res.body.error).toHaveProperty('code', 'RESOURCE_NOT_FOUND');
    });
  });
});
