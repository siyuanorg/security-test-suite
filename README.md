# 🔒 Security Test Suite - SiYuan Organization

**Comprehensive security vulnerability test repository for Security Paranoia Bot validation**

⚠️ **WARNING**: This repository contains **intentional security vulnerabilities** for testing purposes. **DO NOT** deploy this code to production environments.

## 🎯 Purpose

This repository serves as a comprehensive test suite for the Security Paranoia Bot deployed in the SiYuan Organization. It contains over **50 distinct security vulnerabilities** across multiple categories to validate detection capabilities.

## 🚨 Vulnerability Categories

### 🛡️ Authentication & Authorization (auth.js)
- **12 vulnerabilities** including:
  - Hardcoded JWT secrets
  - Authentication bypass mechanisms
  - Session fixation vulnerabilities
  - Weak password validation
  - Privilege escalation flaws
  - LDAP injection

### 💾 Database Security (database.js)
- **10 vulnerabilities** including:
  - NoSQL injection (MongoDB)
  - SQL injection (MySQL)
  - Direct object reference
  - Cross-tenant data access
  - Price/inventory manipulation
  - Aggregation pipeline injection

### 💳 Payment Security (payment.js)
- **8 vulnerabilities** including:
  - Direct price manipulation from client
  - Business logic bypasses
  - Credit card data storage issues
  - Refund amount manipulation
  - Subscription price tampering
  - Currency conversion attacks

### 🔧 Utility Functions (utils.js)
- **8 vulnerabilities** including:
  - Command injection (RCE)
  - Path traversal attacks
  - Code injection via eval
  - Weak encryption implementation
  - Information disclosure
  - Insecure random generation

### 🛒 E-commerce Server (server.js)
- **17 vulnerabilities** including:
  - XSS (Cross-Site Scripting)
  - Information disclosure
  - Open redirects
  - Mass assignment
  - Inventory tampering
  - XML External Entity (XXE)

## 🤖 Security Paranoia Bot Integration

This repository is configured with GitHub Actions to automatically trigger the Security Paranoia Bot analysis using the organization template from `siyuanorg/.github`.

### Workflow Configuration

```yaml
name: Security Paranoia Bot Analysis

on:
  pull_request:
    types: [opened, synchronize, reopened]
  workflow_dispatch:

jobs:
  security-analysis:
    uses: siyuanorg/.github/.github/workflows/security-paranoia-bot.yml@main
    with:
      enable_deep_scan: true
      enable_ai_analysis: true
    secrets:
      GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

## 🎯 Expected Detection Results

The Security Paranoia Bot should detect:

- ✅ **50+ total vulnerabilities** across all files
- ✅ **Critical vulnerabilities** (RCE, SQL injection, price manipulation)
- ✅ **High-severity issues** (XSS, authentication bypass, data exposure)
- ✅ **Medium-severity flaws** (weak validation, information disclosure)
- ✅ **Business logic vulnerabilities** (price/inventory tampering)

### AI-Enhanced Analysis

With Gemini AI integration, the bot should provide:
- 🧠 **Context-aware explanations** for each vulnerability
- 🎯 **Reduced false positives** through intelligent analysis
- 💡 **Actionable fix suggestions** tailored to the code context
- 📊 **Confidence scoring** based on vulnerability severity and certainty

## 🚀 Testing the Security Paranoia Bot

### Method 1: Create a Pull Request

1. Create a feature branch
2. Make changes to any of the vulnerable files
3. Open a pull request
4. The Security Paranoia Bot will automatically analyze the changes

### Method 2: Manual Trigger

1. Go to Actions tab in this repository
2. Select "Security Paranoia Bot Analysis" workflow
3. Click "Run workflow"
4. Optionally specify a PR number to analyze

## 📊 Success Criteria

For the Security Paranoia Bot to be considered successful:

- [ ] **Detection Rate**: Identify 90%+ of intentional vulnerabilities
- [ ] **False Positive Rate**: Keep false positives under 10%
- [ ] **AI Analysis**: Provide meaningful explanations for detected issues
- [ ] **Performance**: Complete analysis within 5 minutes
- [ ] **Actionability**: Suggest specific fixes for major vulnerabilities

## 🔧 Repository Structure

```
.
├── .github/
│   └── workflows/
│       └── security-paranoia-bot.yml    # GitHub Actions workflow
├── server.js                            # Main application (17 vulnerabilities)
├── auth.js                             # Authentication module (12 vulnerabilities)
├── database.js                         # Database operations (10 vulnerabilities)
├── payment.js                          # Payment processing (8 vulnerabilities)
├── utils.js                            # Utility functions (8 vulnerabilities)
├── package.json                        # Node.js dependencies
└── README.md                           # This file
```

## 🏆 Test Categories Coverage

### OWASP Top 10 (2021)
- ✅ A01: Broken Access Control
- ✅ A02: Cryptographic Failures
- ✅ A03: Injection
- ✅ A04: Insecure Design
- ✅ A05: Security Misconfiguration
- ✅ A06: Vulnerable Components
- ✅ A07: Identity & Authentication Failures
- ✅ A08: Software & Data Integrity Failures
- ✅ A09: Security Logging Failures
- ✅ A10: Server-Side Request Forgery

### Business Logic Vulnerabilities
- ✅ Price manipulation
- ✅ Inventory tampering
- ✅ Payment bypass
- ✅ Discount abuse
- ✅ Subscription manipulation

### Platform-Specific Issues
- ✅ Node.js/Express vulnerabilities
- ✅ MongoDB NoSQL injection
- ✅ JWT implementation flaws
- ✅ NPM package vulnerabilities

## 🔍 Manual Verification

To manually verify vulnerabilities:

```bash
# Install dependencies
npm install

# Start the vulnerable server
npm start

# The server will run on http://localhost:3000
# Each endpoint contains documented vulnerabilities
```

## 📈 Monitoring and Metrics

The Security Paranoia Bot should provide metrics on:
- Number of vulnerabilities detected per category
- Time taken for analysis
- False positive/negative rates
- AI analysis confidence scores
- Fix suggestion accuracy

## 🤝 Contributing

To add new test cases:

1. Add new vulnerability patterns to existing files
2. Document the vulnerability type and expected detection
3. Update this README with the new test case
4. Test with the Security Paranoia Bot

## ⚠️ Security Notice

**This repository is for testing purposes only.**

- Contains intentional security vulnerabilities
- Should never be deployed to production
- Used exclusively for Security Paranoia Bot validation
- All vulnerabilities are documented and expected

---

**Repository**: `siyuanorg/security-test-suite`  
**Organization**: SiYuan Organization  
**Purpose**: Security Paranoia Bot validation and testing  
**Status**: Active test repository
