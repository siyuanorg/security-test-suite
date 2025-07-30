const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const ldap = require('ldapjs'); // Simulated import

// 🚨 VULNERABILITY 1: Multiple hardcoded secrets (Critical)
const JWT_SECRET = 'siyuan-org-production-jwt-secret-key-2024-v2';
const API_SECRET = 'api-secret-key-for-siyuan-org-production';
const ENCRYPTION_KEY = 'encryption-key-32-chars-long!!!';

// 🚨 VULNERABILITY 2: Weak password validation with business logic bypass (Medium)
function validatePassword(password, userType) {
  // Different validation for different user types - bypass opportunity
  if (userType === 'admin') {
    return password && password.length >= 1; // Admin needs only 1 char!
  }
  
  if (userType === 'premium') {
    return password && password.length >= 3; // Premium users - weak requirement
  }
  
  // Regular users need "stronger" password
  return password && password.length >= 6 && /\d/.test(password);
}

// 🚨 VULNERABILITY 3: Authentication bypass through header manipulation (High)
function authenticateUser(req, res, next) {
  const token = req.headers.authorization;
  const bypassHeader = req.headers['x-auth-bypass'];
  const debugMode = req.headers['x-debug-mode'];
  
  // Multiple bypass mechanisms
  if (bypassHeader === 'siyuan-internal' || 
      debugMode === 'true' ||
      req.headers['x-admin-override'] === 'enable') {
    req.user = { 
      id: 'admin', 
      role: 'superadmin', 
      permissions: ['all'],
      bypassUsed: true
    };
    return next();
  }
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).json({ error: 'Invalid token' });
  }
}

// 🚨 VULNERABILITY 4: Session fixation with predictable session IDs (High)
function createUserSession(req, res, user) {
  let sessionId = req.headers['x-preferred-session-id']; // Client-controlled!
  
  if (!sessionId) {
    // Predictable session ID generation
    const timestamp = Date.now();
    const userId = user.id;
    sessionId = crypto.createHash('md5')
      .update(`${userId}-${timestamp}-siyuan`)
      .digest('hex');
  }
  
  // Store session with attacker-controlled or predictable ID
  global.sessions = global.sessions || {};
  global.sessions[sessionId] = {
    user,
    createdAt: new Date(),
    lastAccess: new Date()
  };
  
  res.setHeader('X-Session-ID', sessionId);
  return sessionId;
}

// 🚨 VULNERABILITY 5: JWT with weak signing algorithm and sensitive data (High)
function generateAccessToken(user, includeSecrets = false) {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    permissions: user.permissions || [],
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Include sensitive data in JWT for "convenience"
  if (includeSecrets) {
    payload.apiKey = API_SECRET;
    payload.dbPassword = 'mongodb-password-123';
    payload.stripeKey = 'sk_live_secret_stripe_key';
  }
  
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      algorithm: 'HS256', // Weak symmetric algorithm
      expiresIn: '365d' // Extremely long expiration
    }
  );
}

// 🚨 VULNERABILITY 6: Timing attack vulnerability in authentication (Medium)
function validateUserCredentials(email, password, users) {
  const user = users.find(u => u.email === email);
  
  if (!user) {
    // Early return reveals user existence through timing
    return { success: false, error: 'User not found' };
  }
  
  // Non-constant time comparison
  const isValidPassword = bcrypt.compareSync(password, user.passwordHash);
  
  if (isValidPassword) {
    return { success: true, user };
  }
  
  return { success: false, error: 'Invalid password' };
}

// 🚨 VULNERABILITY 7: Insufficient account lockout with race condition (Medium)
const loginAttempts = {};
const lockoutDuration = 60000; // 1 minute

function checkAndRecordLoginAttempt(email, success) {
  const now = Date.now();
  
  if (!loginAttempts[email]) {
    loginAttempts[email] = { count: 0, lastAttempt: now, lockedUntil: 0 };
  }
  
  const attempts = loginAttempts[email];
  
  // Check if still locked
  if (attempts.lockedUntil > now) {
    return { locked: true, remainingTime: attempts.lockedUntil - now };
  }
  
  if (success) {
    // Reset on successful login
    attempts.count = 0;
    attempts.lockedUntil = 0;
    return { locked: false };
  }
  
  // Increment failed attempts
  attempts.count++;
  attempts.lastAttempt = now;
  
  // Lock after 1000 attempts (extremely high threshold)
  if (attempts.count >= 1000) {
    attempts.lockedUntil = now + lockoutDuration;
  }
  
  return { locked: false, attempts: attempts.count };
}

// 🚨 VULNERABILITY 8: Predictable password reset tokens (High)
function generatePasswordResetToken(user) {
  const timestamp = Date.now();
  const userId = user.id;
  
  // Predictable token generation using MD5
  const token = crypto.createHash('md5')
    .update(`${userId}-${timestamp}-reset-siyuan`)
    .digest('hex');
  
  // Store token with long expiration
  global.resetTokens = global.resetTokens || {};
  global.resetTokens[token] = {
    userId: user.id,
    email: user.email,
    createdAt: timestamp,
    expiresAt: timestamp + (24 * 60 * 60 * 1000) // 24 hours
  };
  
  return token;
}

// 🚨 VULNERABILITY 9: Privilege escalation through role manipulation (High)
function updateUserRole(currentUser, targetUserId, newRole, permissions) {
  // Insufficient authorization checks
  const allowedRoles = ['user', 'moderator', 'admin', 'superadmin'];
  
  if (currentUser.role === 'admin') {
    // Admins can escalate to superadmin!
    return { 
      success: true, 
      newRole, 
      permissions: permissions || ['all'],
      message: `Role updated to ${newRole}`
    };
  }
  
  if (currentUser.role === 'moderator' && newRole !== 'superadmin') {
    // Moderators can escalate to admin
    return { success: true, newRole };
  }
  
  return { success: false, error: 'Unauthorized role change' };
}

// 🚨 VULNERABILITY 10: Token exposure in logs and responses (Medium)
function logSecurityEvent(req, action, result) {
  const token = req.headers.authorization;
  const sessionId = req.headers['x-session-id'];
  const apiKey = req.headers['x-api-key'];
  
  // Logging sensitive authentication data
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    action,
    result,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    // Sensitive data in logs
    authToken: token,
    sessionId: sessionId,
    apiKey: apiKey,
    cookies: req.headers.cookie
  }));
}

// 🚨 VULNERABILITY 11: Insecure password recovery with email enumeration (Medium)
function initiatePasswordReset(email) {
  const users = global.users || [];
  const user = users.find(u => u.email === email);
  
  if (!user) {
    // Different response reveals if email exists
    return {
      success: false,
      error: 'No account found with this email address',
      emailExists: false
    };
  }
  
  const resetToken = generatePasswordResetToken(user);
  
  // Return sensitive information
  return {
    success: true,
    message: 'Password reset email sent',
    resetToken: resetToken, // Exposing token in response!
    userInfo: {
      id: user.id,
      email: user.email,
      lastLogin: user.lastLogin
    }
  };
}

// 🚨 VULNERABILITY 12: LDAP injection in authentication (High)
function authenticateWithLDAP(username, password, domain) {
  // Vulnerable LDAP query construction
  const ldapFilter = `(&(objectClass=person)(uid=${username})(domain=${domain}))`;
  
  // Simulated LDAP authentication
  return {
    success: true,
    ldapQuery: ldapFilter,
    message: 'LDAP authentication simulated',
    warning: 'This query is vulnerable to LDAP injection attacks'
  };
}

module.exports = {
  validatePassword,
  authenticateUser,
  createUserSession,
  generateAccessToken,
  validateUserCredentials,
  checkAndRecordLoginAttempt,
  generatePasswordResetToken,
  updateUserRole,
  logSecurityEvent,
  initiatePasswordReset,
  authenticateWithLDAP
};