const express = require('express');
const mysql = require('mysql2');
const fs = require('fs');
const { exec } = require('child_process');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const app = express();

// 1. SQL Injection via direct concatenation
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  db.query(query, (err, results) => {
    res.json(results);
  });
});

// 2. XSS vulnerability - unescaped user input
app.get('/search', (req, res) => {
  const searchTerm = req.query.q;
  res.send(`<h1>Search results for: ${searchTerm}</h1>`);
});

// 3. Command injection via user input
app.post('/backup', (req, res) => {
  const filename = req.body.filename;
  exec(`tar -czf backup_${filename}.tar.gz /data`, (error, stdout) => {
    res.json({ message: 'Backup created', output: stdout });
  });
});

// 4. Path traversal vulnerability
app.get('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = `/uploads/${filename}`;
  fs.readFile(filePath, (err, data) => {
    res.send(data);
  });
});

// 5. Insecure direct object reference
app.get('/orders/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  // No authorization check - user can access any order
  const query = `SELECT * FROM orders WHERE id = '${orderId}'`;
  db.query(query, (err, results) => {
    res.json(results[0]);
  });
});

// 6. Weak JWT secret
const JWT_SECRET = 'secret123';
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  // Assume authentication passes
  const token = jwt.sign({ username }, JWT_SECRET);
  res.json({ token });
});

// 7. Missing input validation on payment amount
app.post('/payment', (req, res) => {
  const amount = req.body.amount;
  // Direct usage without validation - could be negative or zero
  processPayment(amount);
  res.json({ success: true });
});

// 8. Hardcoded API key
const STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef';

// 9. Insecure random token generation
function generateResetToken() {
  return Math.random().toString(36).substring(2);
}

// 10. Missing rate limiting on sensitive endpoint
app.post('/reset-password', (req, res) => {
  const email = req.body.email;
  const token = generateResetToken();
  // No rate limiting - vulnerable to abuse
  sendResetEmail(email, token);
  res.json({ message: 'Reset email sent' });
});

// 11. SQL injection in ORDER BY clause
app.get('/products', (req, res) => {
  const sortBy = req.query.sort || 'name';
  const query = `SELECT * FROM products ORDER BY ${sortBy}`;
  db.query(query, (err, results) => {
    res.json(results);
  });
});

// 12. Reflected XSS in error message
app.get('/error', (req, res) => {
  const message = req.query.msg;
  res.send(`<div class="error">Error: ${message}</div>`);
});

// 13. Mass assignment vulnerability
app.put('/users/:id', (req, res) => {
  const userId = req.params.id;
  const userData = req.body;
  // Directly updating all fields from request body
  User.findByIdAndUpdate(userId, userData, (err, user) => {
    res.json(user);
  });
});

// 14. Insecure file upload
app.post('/upload', (req, res) => {
  const file = req.files.document;
  const uploadPath = `/uploads/${file.name}`;
  // No file type validation or sanitization
  file.mv(uploadPath, (err) => {
    res.json({ message: 'File uploaded', path: uploadPath });
  });
});

// 15. Information disclosure through error messages
app.post('/authenticate', (req, res) => {
  const { username, password } = req.body;
  User.findOne({ username }, (err, user) => {
    if (err) {
      res.status(500).json({ error: err.message }); // Exposes internal details
    }
    if (!user) {
      res.status(401).json({ error: 'User does not exist' }); // Username enumeration
    }
  });
});

// 16. LDAP injection vulnerability
app.post('/ldap-search', (req, res) => {
  const username = req.body.username;
  const filter = `(&(objectClass=user)(sAMAccountName=${username}))`;
  // Direct concatenation allows LDAP injection
  ldapClient.search('dc=company,dc=com', { filter }, (err, results) => {
    res.json(results);
  });
});

// 17. Server-side template injection
app.get('/template', (req, res) => {
  const name = req.query.name;
  const template = `Hello ${name}!`;
  // Using template engine with user input
  const rendered = templateEngine.render(template, { name });
  res.send(rendered);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});