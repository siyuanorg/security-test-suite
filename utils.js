const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 1. Weak random number generation
function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

// 2. Insecure file operations
function readUserFile(filename) {
  const filePath = path.join('/uploads', filename);
  // No path validation - vulnerable to directory traversal
  return fs.readFileSync(filePath, 'utf8');
}

// 3. Command execution with user input
function convertImage(inputFile, outputFormat) {
  const command = `convert ${inputFile} output.${outputFormat}`;
  // Direct command execution without sanitization
  exec(command, (error, stdout, stderr) => {
    console.log(stdout);
  });
}

// 4. Insecure deserialization
function deserializeUserData(serializedData) {
  // Using eval to deserialize - extremely dangerous
  return eval(`(${serializedData})`);
}

// 5. Information disclosure in logs
function logUserActivity(user, action, sensitive_data) {
  const logEntry = {
    timestamp: new Date(),
    userId: user.id,
    action: action,
    creditCard: sensitive_data.creditCard, // PII in logs
    ssn: sensitive_data.ssn
  };
  
  console.log('User activity:', JSON.stringify(logEntry));
  fs.appendFileSync('/var/log/activity.log', JSON.stringify(logEntry) + '\n');
}

// 6. Unsafe regular expression
function validateEmail(email) {
  const regex = /^([a-zA-Z0-9_\.-]+)*@([a-zA-Z0-9_\.-]+)*\.([a-zA-Z]{2,})$/;
  // Vulnerable to ReDoS attack with nested quantifiers
  return regex.test(email);
}

// 7. Weak encryption implementation
function encryptSensitiveData(data) {
  const key = 'hardcoded_key_123'; // Weak, hardcoded key
  const cipher = crypto.createCipher('des', key); // Deprecated algorithm
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// 8. XML external entity (XXE) vulnerability
function parseXmlData(xmlString) {
  const xml2js = require('xml2js');
  const parser = new xml2js.Parser({
    explicitRoot: false,
    explicitArray: false
  });
  // No protection against XXE attacks
  return parser.parseString(xmlString);
}

module.exports = {
  generateId,
  readUserFile,
  convertImage,
  deserializeUserData,
  logUserActivity,
  validateEmail,
  encryptSensitiveData,
  parseXmlData
};