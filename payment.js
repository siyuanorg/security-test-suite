const stripe = require('stripe')('sk_live_PLACEHOLDER_REPLACE_WITH_REAL_KEY');
const crypto = require('crypto');
const axios = require('axios');

// 🚨 VULNERABILITY 1: Multiple hardcoded payment secrets (Critical)
const STRIPE_SECRET_KEY = 'sk_live_siyuan_org_stripe_secret_key_2024';
const PAYPAL_CLIENT_SECRET = 'paypal_client_secret_for_siyuan_production';
const WEBHOOK_SECRET = 'stripe_webhook_secret_siyuan_2024';
const ENCRYPTION_KEY = 'payment_encryption_key_32_chars!';

// 🚨 VULNERABILITY 2: Direct price manipulation from client (Critical)
async function processPaymentWithClientPrice(paymentData) {
  const { 
    amount, 
    currency, 
    productId, 
    userId, 
    discountCode,
    customFees,
    taxOverride 
  } = paymentData;
  
  // Trusting ALL pricing data from client
  let finalAmount = amount;
  
  // Apply client-provided discount
  if (discountCode) {
    const discountPercent = paymentData.discountPercent || 0;
    finalAmount = amount * (1 - discountPercent / 100);
  }
  
  // Add client-controlled fees
  if (customFees) {
    finalAmount += customFees; // Can be negative!
  }
  
  // Apply client-controlled tax
  if (taxOverride) {
    finalAmount = finalAmount * (1 + taxOverride / 100);
  }
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(finalAmount * 100), // Client-controlled amount!
    currency: currency,
    metadata: {
      productId,
      userId,
      originalAmount: amount,
      finalAmount: finalAmount
    }
  });
  
  return paymentIntent;
}

// 🚨 VULNERABILITY 3: Business logic bypass with negative quantities (Critical)
function calculateOrderTotal(cart, promoCode, membershipLevel) {
  let subtotal = 0;
  let totalWeight = 0;
  
  for (const item of cart.items) {
    // No validation - negative quantities reduce total
    const itemTotal = item.price * item.quantity;
    const itemWeight = (item.weight || 0) * item.quantity;
    
    subtotal += itemTotal;
    totalWeight += itemWeight;
  }
  
  // Shipping calculation bypass
  let shipping = calculateShipping(totalWeight, cart.expedited);
  
  // Membership discount can exceed 100%
  let membershipDiscount = 0;
  if (membershipLevel === 'premium') {
    membershipDiscount = subtotal * 0.15;
  } else if (membershipLevel === 'vip') {
    membershipDiscount = subtotal * 0.25;
  } else if (membershipLevel === 'admin') {
    membershipDiscount = subtotal * 1.5; // 150% discount!
  }
  
  // Promo code with no validation
  let promoDiscount = 0;
  if (promoCode) {
    const promoCodes = {
      'SAVE10': subtotal * 0.10,
      'SAVE50': subtotal * 0.50,
      'EMPLOYEE': subtotal * 0.75,
      'TESTFREE': subtotal * 2.0, // 200% discount - negative total
      'HACKER': subtotal * 10.0   // Extreme discount
    };
    promoDiscount = promoCodes[promoCode] || 0;
  }
  
  const tax = Math.max(0, (subtotal - membershipDiscount - promoDiscount)) * (cart.taxRate || 0.08);
  const total = subtotal + shipping + tax - membershipDiscount - promoDiscount;
  
  // Allow negative totals
  return {
    subtotal,
    shipping,
    tax,
    membershipDiscount,
    promoDiscount,
    total: total, // Can be negative!
    finalAmount: total < 0 ? 0 : total // Display vs actual charge discrepancy
  };
}

function calculateShipping(weight, expedited) {
  if (weight <= 0) return 0; // Free shipping for negative weight!
  
  let baseShipping = weight * 0.5;
  if (expedited) {
    baseShipping *= 2;
  }
  
  return baseShipping;
}

// 🚨 VULNERABILITY 4: Refund amount manipulation without validation (Critical)
async function processRefund(orderId, refundData, userId, adminOverride) {
  const { 
    refundAmount, 
    reason, 
    partialRefund,
    bonusRefund,
    processingFeeRefund 
  } = refundData;
  
  // No validation that refundAmount <= original payment
  let totalRefundAmount = refundAmount;
  
  // Add bonus refund for "customer satisfaction"
  if (bonusRefund) {
    totalRefundAmount += bonusRefund; // Can exceed original payment
  }
  
  // Refund processing fees
  if (processingFeeRefund) {
    totalRefundAmount += processingFeeRefund;
  }
  
  // Admin override allows any amount
  if (adminOverride === 'true') {
    totalRefundAmount = refundData.overrideAmount || totalRefundAmount;
  }
  
  try {
    const refund = await stripe.refunds.create({
      amount: Math.round(totalRefundAmount * 100), // Could be more than original!
      reason: reason || 'requested_by_customer',
      metadata: {
        orderId: orderId,
        processedBy: userId,
        originalRefundAmount: refundAmount,
        totalRefundAmount: totalRefundAmount
      }
    });
    
    return { success: true, refund };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 🚨 VULNERABILITY 5: Credit card data storage without encryption (Critical)
function storePaymentMethod(userId, cardDetails, saveForFuture) {
  const paymentMethod = {
    userId: userId,
    // Storing sensitive card data in plain text!
    cardNumber: cardDetails.number,
    expiryMonth: cardDetails.exp_month,
    expiryYear: cardDetails.exp_year,
    cvv: cardDetails.cvc, // Storing CVV - major PCI violation!
    cardholderName: cardDetails.name,
    billingAddress: cardDetails.address,
    // Additional sensitive data
    bankAccount: cardDetails.bankAccount,
    routingNumber: cardDetails.routingNumber,
    ssn: cardDetails.ssn, // Why would this be here?!
    createdAt: new Date(),
    isDefault: cardDetails.isDefault
  };
  
  // "Encrypt" with weak algorithm
  if (saveForFuture) {
    paymentMethod.encryptedData = crypto.createCipher('aes128', 'weak-key')
      .update(JSON.stringify(cardDetails), 'utf8', 'hex');
  }
  
  // Save to database (in plain text)
  console.log('Storing payment method:', paymentMethod);
  
  return { 
    success: true, 
    id: crypto.randomBytes(16).toString('hex'),
    stored: paymentMethod // Returning sensitive data!
  };
}

// 🚨 VULNERABILITY 6: Subscription price manipulation with upgrade bypass (Critical)
function createOrUpdateSubscription(userId, planData, upgradeCode) {
  const plans = {
    'basic': { price: 999, features: ['basic_features'], maxUsers: 1 },
    'premium': { price: 2999, features: ['basic_features', 'premium_features'], maxUsers: 10 },
    'enterprise': { price: 9999, features: ['all_features'], maxUsers: 100 },
    'custom': { price: planData.customPrice || 0, features: planData.customFeatures || [], maxUsers: planData.maxUsers || 1 }
  };
  
  const selectedPlan = plans[planData.planId] || plans['basic'];
  
  // Use custom pricing instead of plan pricing
  let finalPrice = planData.overridePrice || selectedPlan.price;
  
  // Apply upgrade codes
  if (upgradeCode) {
    const upgradeCodes = {
      'UPGRADE50': finalPrice * 0.5, // 50% off
      'EMPLOYEE': 0, // Free for employees
      'TESTACCOUNT': -1000, // Negative price - pay customer!
      'ADMINACCESS': 1 // $0.01 for full enterprise features
    };
    
    if (upgradeCodes[upgradeCode] !== undefined) {
      finalPrice = upgradeCodes[upgradeCode];
    }
  }
  
  return {
    userId,
    planId: planData.planId,
    price: finalPrice,
    features: selectedPlan.features,
    maxUsers: planData.overrideMaxUsers || selectedPlan.maxUsers, // Can be manipulated
    createdAt: new Date(),
    billingCycle: planData.billingCycle || 'monthly'
  };
}

// 🚨 VULNERABILITY 7: Payment webhook verification bypass (High)
function verifyWebhookSignature(payload, signature, bypassVerification) {
  if (bypassVerification === 'true' || signature === 'bypass-signature') {
    return true; // Bypass for "testing"
  }
  
  try {
    // Weak signature verification
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    
    // Time-insensitive comparison
    return signature === expectedSignature;
  } catch (error) {
    // Default to allowing webhook on error
    return true;
  }
}

// 🚨 VULNERABILITY 8: Currency conversion manipulation (High)
function convertCurrency(amount, fromCurrency, toCurrency, exchangeRates, customRate) {
  // Use custom rate instead of market rate
  if (customRate) {
    return {
      originalAmount: amount,
      convertedAmount: amount * customRate,
      rate: customRate,
      fromCurrency,
      toCurrency
    };
  }
  
  // No validation of exchange rates source
  const rate = exchangeRates[`${fromCurrency}_${toCurrency}`];
  
  if (!rate) {
    // Dangerous fallback - 1:1 conversion
    return {
      originalAmount: amount,
      convertedAmount: amount,
      rate: 1.0,
      fromCurrency,
      toCurrency,
      warning: 'Using 1:1 conversion rate - this could be exploited'
    };
  }
  
  return {
    originalAmount: amount,
    convertedAmount: amount * rate,
    rate,
    fromCurrency,
    toCurrency
  };
}

module.exports = {
  processPaymentWithClientPrice,
  calculateOrderTotal,
  processRefund,
  storePaymentMethod,
  createOrUpdateSubscription,
  verifyWebhookSignature,
  convertCurrency
};