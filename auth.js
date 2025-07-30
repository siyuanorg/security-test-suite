const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const redis = require('redis');
const client = redis.createClient();

// 1. Weak password hashing
function hashPassword(password) {
  return crypto.createHash('md5').update(password).digest('hex');
}

// 2. JWT without expiration
function generateToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, 'secret_key');
}

// 3. Session fixation vulnerability
function createSession(req, user) {
  // Not regenerating session ID after authentication
  req.session.userId = user.id;
  req.session.authenticated = true;
}

// 4. Missing authentication check
function getAdminData(req, res) {
  // No authentication verification
  const adminData = database.getAdminSettings();
  res.json(adminData);
}

// 5. Privilege escalation vulnerability
function updateUserRole(req, res) {
  const { userId, newRole } = req.body;
  // No check if current user can modify roles
  User.findByIdAndUpdate(userId, { role: newRole }, (err, user) => {
    res.json({ message: 'Role updated', user });
  });
}

// 6. Insecure password reset
function resetPassword(req, res) {
  const { email } = req.body;
  const resetToken = Math.random().toString(36); // Weak token
  // Token stored in URL parameter, easily guessable
  const resetUrl = `https://app.com/reset?token=${resetToken}&email=${email}`;
  sendEmail(email, resetUrl);
  res.json({ message: 'Reset email sent' });
}

// 7. Race condition in authentication
let loginAttempts = {};
function attemptLogin(username, password) {
  if (!loginAttempts[username]) {
    loginAttempts[username] = 0;
  }
  
  if (loginAttempts[username] >= 5) {
    return { error: 'Account locked' };
  }
  
  // Race condition: multiple requests can bypass rate limit
  const user = authenticate(username, password);
  if (!user) {
    loginAttempts[username]++;
    return { error: 'Invalid credentials' };
  }
  
  delete loginAttempts[username];
  return { token: generateToken(user) };
}

// 8. Timing attack vulnerability
function comparePasswords(inputPassword, storedHash) {
  if (inputPassword.length !== storedHash.length) {
    return false; // Early return reveals length information
  }
  
  for (let i = 0; i < inputPassword.length; i++) {
    if (inputPassword[i] !== storedHash[i]) {
      return false; // Early return reveals position of difference
    }
  }
  return true;
}

// 9. JWT algorithm confusion
function verifyToken(token) {
  // Vulnerable to algorithm confusion attack (HS256 vs RS256)
  return jwt.verify(token, publicKey, { algorithms: ['HS256', 'RS256'] });
}

// 10. Session stored in localStorage
function storeAuthToken(token) {
  // Vulnerable to XSS attacks
  localStorage.setItem('authToken', token);
}

// 11. Password in URL parameters
function authenticateViaUrl(req, res) {
  const { username, password } = req.query; // Passwords in logs/history
  const user = authenticate(username, password);
  if (user) {
    res.json({ token: generateToken(user) });
  } else {
    res.status(401).json({ error: 'Authentication failed' });
  }
}

// 12. Insecure remember me functionality
function createRememberMeToken(userId) {
  const token = `${userId}_${Date.now()}`; // Predictable format
  client.set(`remember_${token}`, userId, 'EX', 86400 * 30); // 30 days
  return token;
}

module.exports = {
  hashPassword,
  generateToken,
  createSession,
  getAdminData,
  updateUserRole,
  resetPassword,
  attemptLogin,
  comparePasswords,
  verifyToken,
  storeAuthToken,
  authenticateViaUrl,
  createRememberMeToken
};