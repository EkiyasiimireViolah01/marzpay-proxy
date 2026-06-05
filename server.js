/**
 * MarzPay Proxy Server for Divine Canteen
 * Handles mobile money payments for Uganda (MTN & Airtel)
 * 
 * @author Ekiyasiimire Violah
 * @date June 5, 2026
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MarzPay API Configuration (Your actual credentials)
const MARZPAY_BASE_URL = 'https://api.marzpay.io';
const MARZPAY_AUTH = 'Basic bWFyel9TTmdZMHRwb1FVcFk1WmNoOndIRWdTT0lhUjhCUjNMMDV2NlZFUHFzMTBOZFdNZzU4';
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

    const response = await axios.post(
      `${MARZPAY_BASE_URL}/verify-phone`,
      { phone_number },
      {
        headers: {
          'Authorization': MARZPAY_AUTH,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Phone verification error:', error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      message: error.response?.data?.message || 'Phone verification failed',
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
          'Authorization': MARZPAY_AUTH,
          'Content-Type': 'application/json'
        },
        timeout: 90000 // 90 seconds timeout
      }
    );

    res.status(200).json({
      status: 'success',
      data: response.data
    });

  } catch (error) {
    console.error('Payment collection error:', error.response?.data || error.message);
    
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

    const response = await axios.get(
      `${MARZPAY_BASE_URL}/transactions/${uuid}`,
      {
        headers: {
          'Authorization': MARZPAY_AUTH,
          'Content-Type': 'application/json'
        }
      }
    );

    res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error) {
    console.error('Status check error:', error.response?.data || error.message);
    
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
app.listen(PORT, () => {
  console.log(`🚀 MarzPay Proxy Server running on port ${PORT}`);
  console.log(`📍 Base URL: http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
