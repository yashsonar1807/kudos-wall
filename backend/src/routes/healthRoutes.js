const express = require('express');
const mongoose = require('mongoose');
const { sendSuccess } = require('../utils/apiResponse');
const env = require('../config/env');

const router = express.Router();

/**
 * @route   GET /api/health
 * @desc    System health and database status check
 * @access  Public
 */
router.get('/', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const dbStateCode = mongoose.connection.readyState;
  const dbStatus = dbStateMap[dbStateCode] || 'unknown';

  const healthData = {
    service: 'Internal Team Feedback & Peer Kudos Wall API',
    status: 'ok',
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
    database: {
      status: dbStatus,
      name: mongoose.connection.name || 'kudos_wall',
      host: mongoose.connection.host || 'localhost',
    },
  };

  return sendSuccess(res, {
    message: 'Kudos Wall API service is healthy and operational',
    data: healthData,
    statusCode: 200,
  });
});

module.exports = router;
