const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('../src/config/db');
const {
  User,
  Kudos,
  Reaction,
  RefreshToken,
  Badge,
  UserBadge,
  PointTransaction,
} = require('../src/models');

describe('MongoDB Mongoose Models & Data Layer Tests', () => {
  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await connectDB();
    // Ensure all model indexes are built
    await Promise.all([
      User.init(),
      Kudos.init(),
      Reaction.init(),
      RefreshToken.init(),
      Badge.init(),
      UserBadge.init(),
      PointTransaction.init(),
    ]);
  });

  afterAll(async () => {
    // Clean up test data
    await Promise.all([
      User.deleteMany({ email: /@test-models\.internal$/ }),
      Kudos.deleteMany({}),
      Reaction.deleteMany({}),
      RefreshToken.deleteMany({}),
      Badge.deleteMany({ code: /^TEST_/ }),
      UserBadge.deleteMany({}),
      PointTransaction.deleteMany({}),
    ]);
    await disconnectDB();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({ email: /@test-models\.internal$/ }),
      Kudos.deleteMany({}),
      Reaction.deleteMany({}),
      RefreshToken.deleteMany({}),
      Badge.deleteMany({ code: /^TEST_/ }),
      UserBadge.deleteMany({}),
      PointTransaction.deleteMany({}),
    ]);
  });

  describe('User Model', () => {
    it('should create a valid user with default allowances and hashed password', async () => {
      const rawPassword = 'SecurePassword123!';
      const user = await User.create({
        name: 'Alice Smith',
        email: 'alice@test-models.internal',
        password: rawPassword,
        department: 'Engineering',
      });

      expect(user._id).toBeDefined();
      expect(user.name).toBe('Alice Smith');
      expect(user.email).toBe('alice@test-models.internal');
      expect(user.givingAllowance).toBe(100);
      expect(user.earnedPoints).toBe(0);
      expect(user.isEmailVerified).toBe(false);
      expect(user.createdAt).toBeInstanceOf(Date);
      expect(user.updatedAt).toBeInstanceOf(Date);

      // Verify raw password is never stored in DB
      const dbUser = await User.findById(user._id).select('+password');
      expect(dbUser.password).not.toBe(rawPassword);
      expect(dbUser.password).toMatch(/^\$2[aby]\$\d+\$/);

      // Verify comparePassword method
      const isMatch = await dbUser.comparePassword(rawPassword);
      expect(isMatch).toBe(true);

      const isWrongMatch = await dbUser.comparePassword('WrongPassword123!');
      expect(isWrongMatch).toBe(false);
    });

    it('should reject missing required fields (name, email, password, department)', async () => {
      const user = new User({});
      let err;
      try {
        await user.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.name).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.password).toBeDefined();
      expect(err.errors.department).toBeDefined();
    });

    it('should reject invalid email formats', async () => {
      const user = new User({
        name: 'Invalid Email',
        email: 'not-an-email',
        password: 'Password123!',
        department: 'Design',
      });

      let err;
      try {
        await user.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.email).toBeDefined();
      expect(err.errors.email.message).toContain('valid email address');
    });

    it('should reject invalid department enum values', async () => {
      const user = new User({
        name: 'Invalid Dept',
        email: 'dept@test-models.internal',
        password: 'Password123!',
        department: 'SpaceExploration',
      });

      let err;
      try {
        await user.validate();
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.department).toBeDefined();
    });

    it('should enforce unique email addresses and reject duplicates', async () => {
      await User.create({
        name: 'Original User',
        email: 'duplicate@test-models.internal',
        password: 'Password123!',
        department: 'Engineering',
      });

      let duplicateErr;
      try {
        await User.create({
          name: 'Duplicate User',
          email: 'duplicate@test-models.internal',
          password: 'Password456!',
          department: 'Marketing',
        });
      } catch (error) {
        duplicateErr = error;
      }

      expect(duplicateErr).toBeDefined();
      expect(duplicateErr.code).toBe(11000);
    });

    it('should generate secure email verification and password reset tokens', async () => {
      const user = new User({
        name: 'Token User',
        email: 'token@test-models.internal',
        password: 'Password123!',
        department: 'Sales',
      });

      const rawResetToken = user.createPasswordResetToken();
      expect(typeof rawResetToken).toBe('string');
      expect(rawResetToken.length).toBe(64);
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetToken).not.toBe(rawResetToken);
      expect(user.passwordResetExpires.getTime()).toBeGreaterThan(Date.now());

      const rawVerifyToken = user.createEmailVerificationToken();
      expect(typeof rawVerifyToken).toBe('string');
      expect(rawVerifyToken.length).toBe(64);
      expect(user.emailVerificationToken).toBeDefined();
      expect(user.emailVerificationToken).not.toBe(rawVerifyToken);
      expect(user.emailVerificationExpires.getTime()).toBeGreaterThan(Date.now());

      await user.save();
    });

    it('should omit sensitive fields (password, tokens, __v) when converted to JSON', async () => {
      const user = new User({
        name: 'Sanitized User',
        email: 'sanitize@test-models.internal',
        password: 'SecretPassword123!',
        department: 'Product',
      });
      user.createPasswordResetToken();
      user.createEmailVerificationToken();
      await user.save();

      const userJson = user.toJSON();
      expect(userJson.password).toBeUndefined();
      expect(userJson.passwordResetToken).toBeUndefined();
      expect(userJson.passwordResetExpires).toBeUndefined();
      expect(userJson.emailVerificationToken).toBeUndefined();
      expect(userJson.emailVerificationExpires).toBeUndefined();
      expect(userJson.__v).toBeUndefined();
      expect(userJson.name).toBe('Sanitized User');
    });
  });

  describe('Kudos Model', () => {
    let senderUser;
    let receiverUser;

    beforeEach(async () => {
      senderUser = await User.create({
        name: 'Sender Bob',
        email: 'sender@test-models.internal',
        password: 'Password123!',
        department: 'Engineering',
      });

      receiverUser = await User.create({
        name: 'Receiver Carol',
        email: 'receiver@test-models.internal',
        password: 'Password123!',
        department: 'Design',
      });
    });

    it('should create valid kudos between two different users', async () => {
      const kudos = await Kudos.create({
        sender: senderUser._id,
        receiver: receiverUser._id,
        points: 20,
        message: 'Outstanding work designing the accessible design system!',
        companyValueTags: ['#Teamwork', '#Innovation'],
      });

      expect(kudos._id).toBeDefined();
      expect(kudos.sender.toString()).toBe(senderUser._id.toString());
      expect(kudos.receiver.toString()).toBe(receiverUser._id.toString());
      expect(kudos.points).toBe(20);
      expect(kudos.companyValueTags).toEqual(
        expect.arrayContaining(['#Teamwork', '#Innovation'])
      );
      expect(kudos.createdAt).toBeInstanceOf(Date);
    });

    it('should reject self-gifting when sender and receiver are identical', async () => {
      let err;
      try {
        await Kudos.create({
          sender: senderUser._id,
          receiver: senderUser._id,
          points: 50,
          message: 'Sending kudos to myself which is not allowed.',
          companyValueTags: ['#Excellence'],
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.receiver).toBeDefined();
      expect(err.errors.receiver.message).toContain('Self-gifting is prohibited');
    });

    it('should enforce point bounds (min 1, max 100, integer)', async () => {
      let zeroErr;
      try {
        await Kudos.create({
          sender: senderUser._id,
          receiver: receiverUser._id,
          points: 0,
          message: 'Zero points',
          companyValueTags: ['#Teamwork'],
        });
      } catch (error) {
        zeroErr = error;
      }
      expect(zeroErr).toBeDefined();
      expect(zeroErr.errors.points).toBeDefined();

      let excessiveErr;
      try {
        await Kudos.create({
          sender: senderUser._id,
          receiver: receiverUser._id,
          points: 150,
          message: 'Too many points',
          companyValueTags: ['#Teamwork'],
        });
      } catch (error) {
        excessiveErr = error;
      }
      expect(excessiveErr).toBeDefined();
      expect(excessiveErr.errors.points).toBeDefined();
    });

    it('should reject invalid company value tags', async () => {
      let err;
      try {
        await Kudos.create({
          sender: senderUser._id,
          receiver: receiverUser._id,
          points: 10,
          message: 'Invalid tag test',
          companyValueTags: ['#InvalidTagRandom'],
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors['companyValueTags.0']).toBeDefined();
    });

    it('should reject empty company value tags array', async () => {
      let err;
      try {
        await Kudos.create({
          sender: senderUser._id,
          receiver: receiverUser._id,
          points: 10,
          message: 'No tag test',
          companyValueTags: [],
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.companyValueTags).toBeDefined();
    });
  });

  describe('Reaction Model', () => {
    let user;
    let kudos;

    beforeEach(async () => {
      const sender = await User.create({
        name: 'Sender Dave',
        email: 'sender-dave@test-models.internal',
        password: 'Password123!',
        department: 'Operations',
      });

      const receiver = await User.create({
        name: 'Receiver Eve',
        email: 'receiver-eve@test-models.internal',
        password: 'Password123!',
        department: 'HR',
      });

      user = await User.create({
        name: 'Reactor Frank',
        email: 'reactor-frank@test-models.internal',
        password: 'Password123!',
        department: 'Finance',
      });

      kudos = await Kudos.create({
        sender: sender._id,
        receiver: receiver._id,
        points: 50,
        message: 'Great help on closing the financial audit!',
        companyValueTags: ['#Integrity'],
      });
    });

    it('should create valid reaction with allowed emoji type', async () => {
      const reaction = await Reaction.create({
        user: user._id,
        kudos: kudos._id,
        type: '🔥',
      });

      expect(reaction._id).toBeDefined();
      expect(reaction.type).toBe('🔥');
      expect(reaction.user.toString()).toBe(user._id.toString());
      expect(reaction.kudos.toString()).toBe(kudos._id.toString());
    });

    it('should reject unsupported reaction emoji type', async () => {
      let err;
      try {
        await Reaction.create({
          user: user._id,
          kudos: kudos._id,
          type: '💩',
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.errors.type).toBeDefined();
    });

    it('should prevent duplicate identical reactions from the same user on the same kudos', async () => {
      await Reaction.create({
        user: user._id,
        kudos: kudos._id,
        type: '👏',
      });

      let duplicateErr;
      try {
        await Reaction.create({
          user: user._id,
          kudos: kudos._id,
          type: '👏',
        });
      } catch (error) {
        duplicateErr = error;
      }

      expect(duplicateErr).toBeDefined();
      expect(duplicateErr.code).toBe(11000);
    });

    it('should allow user to give different reaction types on the same kudos', async () => {
      const reaction1 = await Reaction.create({
        user: user._id,
        kudos: kudos._id,
        type: '+1',
      });

      const reaction2 = await Reaction.create({
        user: user._id,
        kudos: kudos._id,
        type: '🚀',
      });

      expect(reaction1._id).toBeDefined();
      expect(reaction2._id).toBeDefined();
    });
  });

  describe('RefreshToken Model', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        name: 'Token Owner',
        email: 'token-owner@test-models.internal',
        password: 'Password123!',
        department: 'Engineering',
      });
    });

    it('should securely hash raw refresh token and not store plaintext', async () => {
      const rawToken = 'sample_secure_raw_jwt_refresh_token_string_12345';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const tokenDoc = await RefreshToken.createTokenRecord({
        userId: user._id,
        rawToken,
        expiresAt,
        ipAddress: '127.0.0.1',
        userAgent: 'Jest/29.7.0',
      });

      expect(tokenDoc._id).toBeDefined();
      expect(tokenDoc.user.toString()).toBe(user._id.toString());
      expect(tokenDoc.tokenHash).not.toBe(rawToken);
      expect(tokenDoc.tokenHash).toBe(RefreshToken.hashToken(rawToken));
      expect(tokenDoc.revoked).toBe(false);
      expect(tokenDoc.isActive()).toBe(true);
    });

    it('should support token revocation with replacement hash for rotation', async () => {
      const rawOldToken = 'old_refresh_token_to_rotate';
      const rawNewToken = 'new_replacement_refresh_token';
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const tokenDoc = await RefreshToken.createTokenRecord({
        userId: user._id,
        rawToken: rawOldToken,
        expiresAt,
      });

      await tokenDoc.revoke(rawNewToken);

      expect(tokenDoc.revoked).toBe(true);
      expect(tokenDoc.revokedAt).toBeInstanceOf(Date);
      expect(tokenDoc.isActive()).toBe(false);
      expect(tokenDoc.replacedByTokenHash).toBe(RefreshToken.hashToken(rawNewToken));
    });
  });

  describe('Badge & UserBadge Models', () => {
    let user;
    let badge;

    beforeEach(async () => {
      user = await User.create({
        name: 'Badge Earner',
        email: 'badge-earner@test-models.internal',
        password: 'Password123!',
        department: 'Design',
      });

      badge = await Badge.create({
        name: 'Test First Kudos',
        code: 'TEST_FIRST_KUDOS',
        description: 'Awarded for sending your very first peer recognition',
        icon: 'sparkles',
        category: 'giving',
        pointsBonus: 5,
      });
    });

    it('should reject duplicate badge codes', async () => {
      let err;
      try {
        await Badge.create({
          name: 'Another Badge',
          code: 'TEST_FIRST_KUDOS',
          description: 'Duplicate code should fail',
          icon: 'star',
          category: 'milestone',
        });
      } catch (error) {
        err = error;
      }

      expect(err).toBeDefined();
      expect(err.code).toBe(11000);
    });

    it('should award badge to user and prevent duplicate awards', async () => {
      const award1 = await UserBadge.create({
        user: user._id,
        badge: badge._id,
      });
      expect(award1._id).toBeDefined();

      let duplicateErr;
      try {
        await UserBadge.create({
          user: user._id,
          badge: badge._id,
        });
      } catch (error) {
        duplicateErr = error;
      }

      expect(duplicateErr).toBeDefined();
      expect(duplicateErr.code).toBe(11000);
    });
  });

  describe('PointTransaction Model (Audit Ledger)', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        name: 'Audit User',
        email: 'audit-user@test-models.internal',
        password: 'Password123!',
        department: 'Finance',
      });
    });

    it('should record an auditable point transaction', async () => {
      const tx = await PointTransaction.create({
        user: user._id,
        type: 'KUDOS_SENT',
        wallet: 'givingAllowance',
        amount: -20,
        balanceBefore: 100,
        balanceAfter: 80,
        description: 'Sent 20 pts to a teammate for #Innovation',
      });

      expect(tx._id).toBeDefined();
      expect(tx.amount).toBe(-20);
      expect(tx.balanceBefore).toBe(100);
      expect(tx.balanceAfter).toBe(80);
      expect(tx.wallet).toBe('givingAllowance');
      expect(tx.status).toBe('COMPLETED');
    });

    it('should reject zero amount or negative balances in ledger', async () => {
      let zeroErr;
      try {
        await PointTransaction.create({
          user: user._id,
          type: 'ADMIN_ADJUSTMENT',
          wallet: 'earnedPoints',
          amount: 0,
          balanceBefore: 50,
          balanceAfter: 50,
          description: 'Zero transaction',
        });
      } catch (error) {
        zeroErr = error;
      }

      expect(zeroErr).toBeDefined();
      expect(zeroErr.errors.amount).toBeDefined();

      let negativeBalanceErr;
      try {
        await PointTransaction.create({
          user: user._id,
          type: 'KUDOS_SENT',
          wallet: 'givingAllowance',
          amount: -50,
          balanceBefore: 20,
          balanceAfter: -30,
          description: 'Overdraft transaction',
        });
      } catch (error) {
        negativeBalanceErr = error;
      }

      expect(negativeBalanceErr).toBeDefined();
      expect(negativeBalanceErr.errors.balanceAfter).toBeDefined();
    });
  });
});
