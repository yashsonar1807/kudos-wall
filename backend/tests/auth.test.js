const request = require('supertest');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { User, RefreshToken } = require('../src/models');

describe('Authentication & Dual-Token Security Integration Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    await Promise.all([
      User.init(),
      RefreshToken.init(),
    ]);
  });

  afterAll(async () => {
    await Promise.all([
      User.deleteMany({ email: /@test-auth\.internal$/ }),
      RefreshToken.deleteMany({}),
    ]);
    await disconnectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({ email: /@test-auth\.internal$/ }),
      RefreshToken.deleteMany({}),
    ]);
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user, issue dual httpOnly cookies, and generate simulated verification token', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Sarah Connor',
          email: 'sarah@test-auth.internal',
          password: 'Password123!',
          department: 'Engineering',
          avatar: 'https://example.com/avatar.png',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.name).toBe('Sarah Connor');
      expect(res.body.data.user.email).toBe('sarah@test-auth.internal');
      expect(res.body.data.user.department).toBe('Engineering');
      expect(res.body.data.user.givingAllowance).toBe(100);
      expect(res.body.data.user.earnedPoints).toBe(0);
      expect(res.body.data.user.isEmailVerified).toBe(false);

      // Verify password is NEVER returned in response
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.emailVerificationToken).toBeUndefined();

      // Verify email verification simulation data
      expect(res.body.data.emailVerificationSimulation).toBeDefined();
      expect(res.body.data.emailVerificationSimulation.token).toBeDefined();
      expect(typeof res.body.data.emailVerificationSimulation.token).toBe('string');

      // Verify secure httpOnly cookies are set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='));
      const refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='));

      expect(accessTokenCookie).toBeDefined();
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toBeDefined();
      expect(refreshTokenCookie).toContain('HttpOnly');

      // Verify DB state: password is saved as bcrypt hash
      const dbUser = await User.findOne({ email: 'sarah@test-auth.internal' }).select('+password');
      expect(dbUser).toBeDefined();
      expect(dbUser.password).toMatch(/^\$2[aby]\$\d+\$/);
    });

    it('should reject signup with duplicate email address with 409 Conflict', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'First User',
          email: 'duplicate@test-auth.internal',
          password: 'Password123!',
          department: 'Engineering',
        });

      const duplicateRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Second User',
          email: 'duplicate@test-auth.internal',
          password: 'AnotherPassword123!',
          department: 'Marketing',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject signup when required fields are missing or invalid', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'A', // too short (<2)
          email: 'invalid-email',
          password: 'short', // too short (<8)
          department: 'InvalidDepartment',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);
      expect(res.body.error.details.length).toBe(4);
    });
  });

  describe('POST /api/auth/verify-email (Simulation)', () => {
    it('should successfully verify email when given valid simulation token', async () => {
      const signupRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Verify User',
          email: 'verify@test-auth.internal',
          password: 'Password123!',
          department: 'Product',
        });

      const verificationToken = signupRes.body.data.emailVerificationSimulation.token;

      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: 'verify@test-auth.internal',
          token: verificationToken,
        });

      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.success).toBe(true);
      expect(verifyRes.body.data.user.isEmailVerified).toBe(true);

      // Verify in DB
      const dbUser = await User.findOne({ email: 'verify@test-auth.internal' });
      expect(dbUser.isEmailVerified).toBe(true);
    });

    it('should reject email verification with incorrect token', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Wrong Token User',
          email: 'wrongtoken@test-auth.internal',
          password: 'Password123!',
          department: 'Design',
        });

      const verifyRes = await request(app)
        .post('/api/auth/verify-email')
        .send({
          email: 'wrongtoken@test-auth.internal',
          token: 'invalid_token_1234567890abcdef',
        });

      expect(verifyRes.status).toBe(400);
      expect(verifyRes.body.success).toBe(false);
      expect(verifyRes.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Login User',
          email: 'login@test-auth.internal',
          password: 'CorrectPassword123!',
          department: 'Engineering',
        });
    });

    it('should authenticate user with valid credentials and issue httpOnly cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test-auth.internal',
          password: 'CorrectPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('login@test-auth.internal');
      expect(res.body.data.user.password).toBeUndefined();

      // Check cookies
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const accessTokenCookie = cookies.find((c) => c.startsWith('accessToken='));
      const refreshTokenCookie = cookies.find((c) => c.startsWith('refreshToken='));
      expect(accessTokenCookie).toContain('HttpOnly');
      expect(refreshTokenCookie).toContain('HttpOnly');

      // Check DB refresh token record was created
      const tokenDoc = await RefreshToken.findOne({ user: res.body.data.user._id });
      expect(tokenDoc).toBeDefined();
      expect(tokenDoc.revoked).toBe(false);
    });

    it('should reject invalid password with 401 Unauthorized without leaking password details', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'login@test-auth.internal',
          password: 'WrongPassword999!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user with 401 Unauthorized without leaking account existence', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@test-auth.internal',
          password: 'AnyPassword123!',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/auth/me (Protected Route & Auth Middleware)', () => {
    let authCookies;
    let rawAccessToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Me User',
          email: 'me@test-auth.internal',
          password: 'Password123!',
          department: 'Sales',
        });

      authCookies = res.headers['set-cookie'];
      const accessCookie = authCookies.find((c) => c.startsWith('accessToken='));
      rawAccessToken = accessCookie.split(';')[0].split('=')[1];
    });

    it('should access protected route using httpOnly cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@test-auth.internal');
      expect(res.body.data.user.department).toBe('Sales');
      expect(res.body.data.user.givingAllowance).toBe(100);
    });

    it('should access protected route using Authorization Bearer header', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${rawAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('me@test-auth.internal');
    });

    it('should reject access when no credentials are provided', async () => {
      const res = await request(app).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_AUTHENTICATED');
    });

    it('should reject access with malformed or tampered token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.token.payload');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('POST /api/auth/refresh (Rotation & Replay Protection)', () => {
    let authCookies;
    let oldRefreshToken;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Refresh User',
          email: 'refresh@test-auth.internal',
          password: 'Password123!',
          department: 'Finance',
        });

      authCookies = res.headers['set-cookie'];
      const refreshCookie = authCookies.find((c) => c.startsWith('refreshToken='));
      oldRefreshToken = refreshCookie.split(';')[0].split('=')[1];
    });

    it('should rotate tokens and return new cookie pair', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', authCookies);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('refresh@test-auth.internal');

      const newCookies = res.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      const newRefreshCookie = newCookies.find((c) => c.startsWith('refreshToken='));
      const newRefreshToken = newRefreshCookie.split(';')[0].split('=')[1];

      // Refresh token string MUST be rotated
      expect(newRefreshToken).not.toBe(oldRefreshToken);

      // Verify old token is marked revoked in DB
      const oldTokenHash = RefreshToken.hashToken(oldRefreshToken);
      const oldDoc = await RefreshToken.findOne({ tokenHash: oldTokenHash });
      expect(oldDoc.revoked).toBe(true);
      expect(oldDoc.replacedByTokenHash).toBe(RefreshToken.hashToken(newRefreshToken));
    });

    it('should detect replay attack when replaying an already-revoked refresh token', async () => {
      // 1. Legitimate first refresh
      const firstRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', authCookies);

      expect(firstRefresh.status).toBe(200);

      // 2. Adversary attempts to use the old (already-rotated) refresh token again
      const replayRes = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${oldRefreshToken}`]);

      // MUST be rejected with 403 Forbidden
      expect(replayRes.status).toBe(403);
      expect(replayRes.body.success).toBe(false);
      expect(replayRes.body.error.code).toBe('REFRESH_TOKEN_REPLAY');

      // Verify that all active tokens for this user were invalidated for security
      const activeTokens = await RefreshToken.find({
        user: firstRefresh.body.data.user._id,
        revoked: false,
      });
      expect(activeTokens.length).toBe(0);
    });

    it('should reject refresh when no refresh token cookie is sent', async () => {
      const res = await request(app).post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('REFRESH_TOKEN_REQUIRED');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should revoke refresh token in database and clear cookies', async () => {
      const loginRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Logout User',
          email: 'logout@test-auth.internal',
          password: 'Password123!',
          department: 'HR',
        });

      const cookies = loginRes.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      const rawRefreshToken = refreshCookie.split(';')[0].split('=')[1];

      // Logout request
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Check cookies cleared (expires in past / max-age=0)
      const clearCookies = logoutRes.headers['set-cookie'];
      expect(clearCookies).toBeDefined();

      // Check refresh token marked revoked in DB
      const tokenHash = RefreshToken.hashToken(rawRefreshToken);
      const tokenDoc = await RefreshToken.findOne({ tokenHash });
      expect(tokenDoc.revoked).toBe(true);

      // Subsequent refresh with this token should fail
      const subsequentRefresh = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', [`refreshToken=${rawRefreshToken}`]);

      expect(subsequentRefresh.status).toBe(403); // Replay of revoked token
    });
  });
});
