const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');
const crypto = require('crypto');
const os = require('os');

// 🚨 VULNERABILITY 1: Command injection with multiple attack vectors (Critical)
function executeSystemCommand(command, args, options) {
  // Multiple injection points
  const fullCommand = `${command} ${args.join(' ')}`;
  const environment = options.env || process.env;
  const workingDir = options.cwd || process.cwd();
  
  // Direct command execution with user input
  return new Promise((resolve, reject) => {
    exec(`cd ${workingDir} && ${fullCommand}`, { env: environment }, (error, stdout, stderr) => {
      if (error) {
        reject({
          error: error.message,
          command: fullCommand, // Information disclosure
          workingDirectory: workingDir
        });
      } else {
        resolve({
          output: stdout,
          errors: stderr,
          command: fullCommand,
          executedAt: new Date().toISOString()
        });
      }
    });
  });
}

// 🚨 VULNERABILITY 2: Advanced path traversal with multiple bypass techniques (Critical)
function readFileFromPath(filename, subfolder, rootOverride) {
  // Multiple path manipulation opportunities
  let basePath = rootOverride || './user-uploads/';
  let fullPath;
  
  if (subfolder) {
    // No sanitization of subfolder
    fullPath = path.join(basePath, subfolder, filename);
  } else {
    fullPath = path.join(basePath, filename);
  }
  
  // Additional bypass through query parameters
  if (filename.includes('?')) {
    const [file, params] = filename.split('?');
    const urlParams = new URLSearchParams(params);
    const altPath = urlParams.get('path');
    
    if (altPath) {
      fullPath = altPath; // Complete path override!
    }
  }
  
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    return {
      success: true,
      content,
      path: fullPath, // Path disclosure
      stats: fs.statSync(fullPath) // Additional info disclosure
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      attemptedPath: fullPath, // Path disclosure even on error
      suggestion: 'Try using ../ to navigate directories'
    };
  }
}

// 🚨 VULNERABILITY 3: Unsafe file operations with overwrite capability (High)
function saveFileWithMetadata(filename, content, metadata, allowOverwrite) {
  // No validation of filename or content
  const uploadPath = metadata.customPath || './uploads/';
  const fullPath = path.join(uploadPath, filename);
  
  // Create directory if it doesn't exist
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Check if file exists
  if (fs.existsSync(fullPath) && !allowOverwrite) {
    return {
      success: false,
      error: 'File already exists',
      existingFile: fullPath,
      overwriteHint: 'Set allowOverwrite=true to replace'
    };
  }
  
  // Write file with metadata
  const fileData = {
    content: content,
    metadata: metadata,
    createdAt: new Date().toISOString(),
    originalName: filename,
    systemInfo: {
      platform: os.platform(),
      hostname: os.hostname(),
      user: os.userInfo().username
    }
  };
  
  fs.writeFileSync(fullPath, JSON.stringify(fileData, null, 2));
  
  return {
    success: true,
    path: fullPath,
    size: fs.statSync(fullPath).size,
    systemInfo: fileData.systemInfo
  };
}

// 🚨 VULNERABILITY 4: Weak random generation for security-critical operations (Medium)
function generateSecurityTokens(tokenType, length) {
  const tokens = {};
  
  // Different weak random generation methods
  switch (tokenType) {
    case 'session':
      // Using Math.random() for session tokens
      tokens.sessionId = Math.random().toString(36).substring(2, length + 2);
      break;
      
    case 'api':
      // Predictable API key generation
      const timestamp = Date.now();
      tokens.apiKey = crypto.createHash('md5')
        .update(`api-${timestamp}-siyuan`)
        .digest('hex').substring(0, length);
      break;
      
    case 'password':
      // Weak password generation
      const chars = 'abcdefghijklmnopqrstuvwxyz123456789';
      let password = '';
      for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      tokens.password = password;
      break;
      
    case 'reset':
      // Predictable reset token
      tokens.resetToken = crypto.createHash('sha1')
        .update(`reset-${Date.now()}-${Math.random()}`)
        .digest('hex');
      break;
      
    default:
      tokens.generic = Math.random().toString(16).substring(2, length + 2);
  }
  
  return tokens;
}

// 🚨 VULNERABILITY 5: Code injection through eval and Function constructor (Critical)
function executeUserScript(script, context, allowDangerousOps) {
  // Multiple code execution vulnerabilities
  const safeContext = {
    Math: Math,
    Date: Date,
    JSON: JSON,
    ...context
  };
  
  if (allowDangerousOps) {
    // Expose dangerous globals
    safeContext.require = require;
    safeContext.process = process;
    safeContext.fs = fs;
    safeContext.console = console;
    safeContext.global = global;
  }
  
  try {
    // Multiple dangerous execution methods
    if (script.startsWith('eval:')) {
      const code = script.substring(5);
      return eval(`(function() { ${code} })()`);
    }
    
    if (script.startsWith('func:')) {
      const code = script.substring(5);
      const func = new Function('context', `with(context) { ${code} }`);
      return func(safeContext);
    }
    
    // Default: still dangerous eval
    return eval(`(function(context) { with(context) { ${script} } })`)(safeContext);
    
  } catch (error) {
    return {
      error: error.message,
      script: script, // Script disclosure
      context: Object.keys(safeContext)
    };
  }
}

// 🚨 VULNERABILITY 6: Information disclosure through detailed error messages (Medium)
function connectToExternalService(serviceUrl, credentials, timeout) {
  try {
    // Simulate service connection
    if (serviceUrl.includes('localhost') || serviceUrl.includes('127.0.0.1')) {
      throw new Error(`Connection failed to ${serviceUrl}: Invalid credentials ${JSON.stringify(credentials)}`);
    }
    
    if (!credentials.apiKey) {
      throw new Error(`Missing API key for service ${serviceUrl}. Required format: {apiKey: 'your-key', secret: 'your-secret'}`);
    }
    
    return { success: true, connectedTo: serviceUrl };
    
  } catch (error) {
    // Exposing sensitive connection details in error
    throw new Error(`Service connection error: ${error.message}\nService: ${serviceUrl}\nCredentials: ${JSON.stringify(credentials)}\nSystem: ${os.hostname()}`);
  }
}

// 🚨 VULNERABILITY 7: Weak encryption with hardcoded keys and poor algorithms (High)
function encryptSensitiveData(data, encryptionType) {
  // Multiple weak encryption implementations
  const algorithms = {
    'weak': {
      algorithm: 'aes-128-ecb', // Weak algorithm
      key: 'simple-key-123456' // Hardcoded key
    },
    'medium': {
      algorithm: 'aes-192-cbc',
      key: 'medium-strength-key-siyuan-2024!!',
      iv: '1234567890123456' // Hardcoded IV
    },
    'strong': {
      algorithm: 'aes-256-gcm',
      key: 'strong-key-but-still-hardcoded-siyuan-org-2024-production!',
      iv: crypto.randomBytes(16) // At least random IV
    }
  };
  
  const config = algorithms[encryptionType] || algorithms['weak'];
  
  try {
    const cipher = crypto.createCipher(config.algorithm, config.key);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return {
      encrypted,
      algorithm: config.algorithm,
      keyHint: config.key.substring(0, 8) + '...', // Partial key disclosure
      iv: config.iv
    };
  } catch (error) {
    return {
      error: error.message,
      algorithm: config.algorithm,
      key: config.key // Full key disclosure on error!
    };
  }
}

// 🚨 VULNERABILITY 8: System information disclosure (Low)
function getSystemDiagnostics(includeSecrets) {
  const diagnostics = {
    system: {
      platform: os.platform(),
      architecture: os.arch(),
      hostname: os.hostname(),
      uptime: os.uptime(),
      loadAverage: os.loadavg(),
      memory: process.memoryUsage(),
      versions: process.versions
    },
    process: {
      pid: process.pid,
      cwd: process.cwd(),
      execPath: process.execPath,
      argv: process.argv
    },
    network: {
      interfaces: os.networkInterfaces()
    }
  };
  
  if (includeSecrets === 'true') {
    diagnostics.environment = process.env; // Full environment variables!
    diagnostics.userInfo = os.userInfo();
  }
  
  return diagnostics;
}

module.exports = {
  executeSystemCommand,
  readFileFromPath,
  saveFileWithMetadata,
  generateSecurityTokens,
  executeUserScript,
  connectToExternalService,
  encryptSensitiveData,
  getSystemDiagnostics
};