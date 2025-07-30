const express = require('express');
const { MongoClient } = require('mongodb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const app = express();

app.use(express.json());

// 🚨 VULNERABILITY 1: Hardcoded database credentials (Critical)
const mongoUrl = 'mongodb://admin:SuperSecret123@prod-cluster.mongodb.net:27017/ecommerce';
const client = new MongoClient(mongoUrl);

// 🚨 VULNERABILITY 2: Hardcoded JWT secret (Critical)
const JWT_SECRET = 'siyuan-org-super-secret-jwt-key-2024-production';

// 🚨 VULNERABILITY 3: XSS vulnerability - unsanitized user input (High)
app.get('/search', (req, res) => {
  const query = req.query.q;
  const category = req.query.category;
  // Direct HTML injection without sanitization
  res.send(`<h1>Search results for: ${query}</h1><p>Category: ${category}</p>`);
});

// 🚨 VULNERABILITY 4: NoSQL injection in product search (High)
app.get('/products', async (req, res) => {
  const { minPrice, maxPrice, category } = req.query;
  const db = client.db('ecommerce');
  
  // Direct object insertion allows NoSQL injection
  const products = await db.collection('products').find({
    price: { $gte: minPrice, $lte: maxPrice },
    category: category // Can be manipulated with $ne, $regex, etc.
  }).toArray();
  
  res.json(products);
});

// 🚨 VULNERABILITY 5: Information disclosure - sensitive data exposure (High)
app.get('/admin/users', (req, res) => {
  // No authentication check!
  res.json({
    users: [
      { 
        id: 1, 
        email: 'admin@siyuanorg.com', 
        password: '$2b$10$hashedPasswordExample123',
        creditCard: '4111-1111-1111-1111',
        ssn: '123-45-6789'
      },
      { 
        id: 2, 
        email: 'user@siyuanorg.com', 
        apiKey: 'sk_live_real_stripe_key_example',
        bankAccount: '123456789'
      }
    ],
    secrets: {
      databaseUrl: mongoUrl,
      jwtSecret: JWT_SECRET,
      stripeKey: 'sk_live_sensitive_key'
    }
  });
});

// 🚨 VULNERABILITY 6: Weak password validation (Medium)
app.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  
  // Extremely weak password validation
  if (password.length < 2) {
    return res.status(400).json({ error: 'Password too short' });
  }
  
  // No email validation
  // No role validation - can set admin role
  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Save user with potentially admin role
  res.json({ 
    message: 'User registered successfully',
    user: { email, role: role || 'user' }
  });
});

// 🚨 VULNERABILITY 7: Open redirect vulnerability (Medium)
app.get('/redirect', (req, res) => {
  const url = req.query.url;
  // Can redirect to malicious sites - phishing attacks
  res.redirect(url);
});

// 🚨 VULNERABILITY 8: Price manipulation vulnerability (Critical)
app.post('/purchase', async (req, res) => {
  const { productId, quantity, price, discount } = req.body; // Price comes from client!
  
  // Trusting client-side price calculation
  let total = quantity * price;
  
  // Discount can be negative for additional profit
  if (discount) {
    total -= discount; // Can be manipulated
  }
  
  // Process payment with manipulated price
  console.log(`Processing payment of $${total} for product ${productId}`);
  res.json({ 
    success: true, 
    total,
    message: `Charged $${total} to your account`
  });
});

// 🚨 VULNERABILITY 9: Inventory tampering (High)
app.post('/admin/inventory', (req, res) => {
  const { productId, stockChange, reason } = req.body;
  
  // No authentication or authorization check
  // No validation on stock change - can be negative
  console.log(`Adjusting stock for product ${productId} by ${stockChange}`);
  
  res.json({ 
    success: true,
    message: `Stock adjusted by ${stockChange}`,
    newStock: Math.max(0, stockChange) // Prevents negative display but not storage
  });
});

// 🚨 VULNERABILITY 10: Session fixation (High)
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  // Accept session ID from client - session fixation vulnerability
  const sessionId = req.headers['x-session-id'] || req.body.sessionId || 'default';
  
  // Weak authentication simulation
  if (email && password) {
    res.json({
      success: true,
      sessionId: sessionId, // Using attacker-controlled session ID
      token: jwt.sign({ email, sessionId }, JWT_SECRET)
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// 🚨 VULNERABILITY 11: Command injection (Critical)
app.post('/backup', (req, res) => {
  const { filename, compression } = req.body;
  const { exec } = require('child_process');
  
  // Direct command execution with user input - RCE vulnerability
  const command = `tar -${compression}f ${filename}.tar.gz /data && echo "Backup created"`;
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      res.status(500).json({ error: error.message });
    } else {
      res.json({ 
        message: 'Backup created successfully',
        output: stdout,
        filename: `${filename}.tar.gz`
      });
    }
  });
});

// 🚨 VULNERABILITY 12: Path traversal (High)
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const subfolder = req.query.subfolder || '';
  const fs = require('fs');
  
  // No path sanitization - directory traversal attack
  const fullPath = `./uploads/${subfolder}/${filename}`;
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    res.send(content);
  } catch (error) {
    res.status(404).json({ 
      error: 'File not found',
      path: fullPath // Information disclosure
    });
  }
});

// 🚨 VULNERABILITY 13: Weak authentication middleware (Medium)
function weakAuth(req, res, next) {
  const token = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  
  // Multiple weak authentication methods
  if (token === 'Bearer admin-token' || 
      apiKey === 'siyuan-api-key-2024' ||
      req.query.auth === 'bypass') {
    req.user = { role: 'admin', id: 1 };
    next();
  } else {
    res.status(403).json({ error: 'Access denied' });
  }
}

// 🚨 VULNERABILITY 14: Mass assignment (Medium)
app.put('/profile/:userId', (req, res) => {
  const userId = req.params.userId;
  const updateData = req.body; // Accepting all fields from request
  
  // No field filtering - can update role, isAdmin, credit, etc.
  console.log(`Updating user ${userId} with:`, updateData);
  
  res.json({ 
    success: true,
    updated: updateData,
    message: 'Profile updated successfully'
  });
});

// 🚨 VULNERABILITY 15: Insufficient logging for security events (Low)
app.delete('/admin/user/:userId', (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  
  // Critical security action with minimal logging
  console.log('User deleted'); // No user ID, timestamp, or reason logged
  
  res.json({ 
    success: true,
    message: `User ${userId} deleted`,
    deletedAt: new Date().toISOString()
  });
});

// 🚨 VULNERABILITY 16: LDAP injection (High)
app.post('/ldap-search', (req, res) => {
  const { username, department } = req.body;
  
  // Simulated LDAP query construction - vulnerable to injection
  const ldapQuery = `(&(objectClass=person)(uid=${username})(department=${department}))`;
  
  res.json({
    query: ldapQuery,
    message: 'LDAP search executed',
    warning: 'This would be vulnerable to LDAP injection in real implementation'
  });
});

// 🚨 VULNERABILITY 17: XML External Entity (XXE) Processing (High)
app.post('/xml-upload', (req, res) => {
  const xml = req.body.xml;
  
  // Simulated XML processing without XXE protection
  res.json({
    message: 'XML processed',
    xml: xml,
    warning: 'This would be vulnerable to XXE attacks in real XML processor'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚨 Security Test Suite Server running on port ${PORT}`);
  console.log('⚠️  WARNING: This server contains intentional vulnerabilities for testing');
  console.log('🔒 Expected Security Paranoia Bot to detect 17+ vulnerabilities in this file');
});