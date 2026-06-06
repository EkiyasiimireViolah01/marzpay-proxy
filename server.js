/**
 * MarzPay Proxy Server for Divine Canteen
 * Handles mobile money payments for Uganda (MTN & Airtel)
 * 
 * @author Ekiyasiimire Violah
 * @date June 5, 2026
 */

console.log('🔄 Starting MarzPay Proxy Server...');
console.log('📦 Loading dependencies...');

const express = require('express');
const cors = require('cors');
const axios = require('axios');

console.log('✅ Dependencies loaded successfully');

const app = express();
const PORT = process.env.PORT || 3000;

console.log(`🔧 Configuration:`);
console.log(`   - Port: ${PORT}`);
console.log(`   - Node Version: ${process.version}`);
console.log(`   - Environment: ${process.env.NODE_ENV || 'development'}`);

// Middleware
console.log('🔧 Setting up middleware...');
app.use(cors());
app.use(express.json());
console.log('✅ Middleware configured');

// MarzPay API Configuration (Your actual credentials)
const MARZPAY_BASE_URL = 'https://api.marzpay.io';
const MARZPAY_API_KEY = 'marz_SNgY0tpoQUpY5Zch';
const MARZPAY_API_SECRET = 'wHEgSOIaR8BR3L05v6VEPqs10NdWMg58';
const PROXY_KEY = 'menugo_divine_canteen_2025';

// Middleware to verify proxy key
const verifyProxyKey = (req, res, next) => {
  const proxyKey = req.headers['x-proxy-key'];
  
  if (!proxyKey || proxyKey !== PROXY_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid proxy key'
    });
  }
  
  next();
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'MarzPay Proxy Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint - Welcome message
app.get('/', (req, res) => {
  res.status(200).json({
    service: 'MarzPay Proxy for Divine Canteen',
    status: 'online',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      verifyPhone: 'POST /verify-phone',
      collect: 'POST /collect',
      status: 'GET /status/:uuid'
    },
    message: 'Server is running successfully!',
    developer: 'Ekiyasiimire Violah (23/BSU/BIT/1319)',
    timestamp: new Date().toISOString()
  });
});

// Verify phone number
app.post('/verify-phone', verifyProxyKey, async (req, res) => {
  try {
    const { phone_number } = req.body;

    if (!phone_number) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    console.log(`[PhoneVerify] Verifying: ${phone_number}`);

    const response = await axios.post(
      `${MARZPAY_BASE_URL}/phone-verification/verify`,
      { phone_number },
      {
        headers: {
          'x-api-key': MARZPAY_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log(`[PhoneVerify] Success:`, response.data);

    res.status(200).json({
      success: true,
      data: response.data.data
    });

  } catch (error) {
    console.error('[PhoneVerify] Error:', error.response?.status, error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || 'Phone verification failed',
      error: error.message
    });
  }
});

// Send money (withdrawal/disbursement)
app.post('/send-money', verifyProxyKey, async (req, res) => {
  try {
    const { phone_number, amount, country, reference, description, recipient_name } = req.body;

    // Validation
    if (!phone_number || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and amount are required'
      });
    }

    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount is UGX 1,000'
      });
    }

    console.log(`[SendMoney] Processing: ${amount} UGX to ${phone_number}`);

    // Call MarzPay Send Money API
    const response = await axios.post(
      `${MARZPAY_BASE_URL}/send-money`,
      {
        phone_number,
        amount: parseInt(amount),
        country: country || 'UG',
        reference: reference || `WD_${Date.now()}`,
        description: description || 'Divine Canteen Withdrawal',
        recipient_name: recipient_name || 'Admin'
      },
      {
        headers: {
          'x-api-key': MARZPAY_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );

    console.log(`[SendMoney] Success:`, response.data);

    res.status(200).json({
      status: 'success',
      data: response.data
    });

  } catch (error) {
    console.error('[SendMoney] Error:', error.response?.status, error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      status: 'failed',
      message: error.response?.data?.message || 'Send money failed',
      error: error.message
    });
  }
});

// Collect payment
app.post('/collect', verifyProxyKey, async (req, res) => {
  try {
    const { phone_number, amount, country, reference, description } = req.body;

    // Validation
    if (!phone_number || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and amount are required'
      });
    }

    if (amount < 1000) {
      return res.status(400).json({
        success: false,
        message: 'Minimum amount is UGX 1,000'
      });
    }

    if (amount > 500000) {
      return res.status(400).json({
        success: false,
        message: 'Maximum amount is UGX 500,000'
      });
    }

    console.log(`[Collect] Processing: ${amount} UGX from ${phone_number}`);

    // Call MarzPay API
    const response = await axios.post(
      `${MARZPAY_BASE_URL}/collections`,
      {
        phone_number,
        amount: parseInt(amount),
        country: country || 'UG',
        reference: reference || `ORDER_${Date.now()}`,
        description: description || 'Divine Canteen Order'
      },
      {
        headers: {
          'x-api-key': MARZPAY_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 90000
      }
    );

    console.log(`[Collect] Success:`, response.data);

    res.status(200).json({
      status: 'success',
      data: response.data
    });

  } catch (error) {
    console.error('[Collect] Error:', error.response?.status, error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      status: 'failed',
      message: error.response?.data?.message || 'Payment collection failed',
      error: error.message
    });
  }
});

// Check payment status
app.get('/status/:uuid', verifyProxyKey, async (req, res) => {
  try {
    const { uuid } = req.params;

    if (!uuid) {
      return res.status(400).json({
        success: false,
        message: 'Transaction UUID is required'
      });
    }

    console.log(`[Status] Checking: ${uuid}`);

    const response = await axios.get(
      `${MARZPAY_BASE_URL}/transactions/${uuid}`,
      {
        headers: {
          'x-api-key': MARZPAY_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log(`[Status] Result:`, response.data);

    res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('[Status] Error:', error.response?.status, error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || 'Status check failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MarzPay Proxy Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`✅ Server started successfully at ${new Date().toISOString()}`);
  console.log(`🌐 Server is ready to accept connections`);
});

// Handle server errors
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use`);
  } else {
    console.error('❌ Server error:', error);
  }
  // Don't exit immediately - let Render handle it
  setTimeout(() => process.exit(1), 1000);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit immediately
  setTimeout(() => process.exit(1), 1000);
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - just log it
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received, closing server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

// Keep process alive
process.on('SIGINT', () => {
  console.log('📴 SIGINT received, closing server...');
  server.close(() => {
    console.log('✅ Server closed gracefully');
    process.exit(0);
  });
});

// Log that we're staying alive
setInterval(() => {
  // This keeps the process alive and logs heartbeat
  if (process.env.NODE_ENV !== 'production') {
    console.log(`💓 Server heartbeat at ${new Date().toISOString()}`);
  }
}, 300000); // Every 5 minutes

module.exports = app;
