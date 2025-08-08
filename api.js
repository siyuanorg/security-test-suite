const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const app = express();

// 1. Overly permissive CORS
app.use(cors({
  origin: '*', // Allows any origin
  credentials: true
}));

// 2. Missing security headers
app.use((req, res, next) => {
  // No CSP, HSTS, or other security headers
  next();
});

// 3. API without rate limiting
app.post('/api/send-email', (req, res) => {
  const { email, message } = req.body;
  // No rate limiting - can be abused for spam
  sendEmail(email, message);
  res.json({ success: true });
});

// 4. Sensitive data in API response
app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);
  // Exposing sensitive fields
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    password_hash: user.password_hash, // Sensitive data
    credit_card: user.credit_card,
    ssn: user.ssn
  });
});

// 5. Missing input validation
app.post('/api/users', (req, res) => {
  const userData = req.body;
  // No validation of required fields or data types
  const user = createUser(userData);
  res.json(user);
});

// 6. API key in URL parameters
app.get('/api/external-service', (req, res) => {
  const apiKey = req.query.api_key; // API key in logs
  const data = callExternalService(apiKey);
  res.json(data);
});

// 7. Insufficient error handling
app.get('/api/orders/:id', (req, res) => {
  try {
    const order = getOrderById(req.params.id);
    res.json(order);
  } catch (error) {
    // Exposing internal error details
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      query: error.query
    });
  }
});

// 8. Missing authorization checks
app.delete('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  // No check if current user can delete this user
  deleteUser(userId);
  res.json({ message: 'User deleted' });
});

// 9. Prototype pollution vulnerability
app.post('/api/config', (req, res) => {
  const config = req.body;
  // Vulnerable to prototype pollution
  merge(globalConfig, config);
  res.json({ message: 'Config updated' });
});

function merge(target, source) {
  for (let key in source) {
    if (typeof source[key] === 'object' && source[key] !== null) {
      if (!target[key]) target[key] = {};
      merge(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

// 10. Improper session management
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = authenticate(username, password);
  
  if (user) {
    // Session ID sent in response body
    const sessionId = generateSessionId();
    res.json({ 
      success: true, 
      sessionId: sessionId, // Should be in httpOnly cookie
      user: user
    });
  }
});

module.exports = app;