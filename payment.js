const stripe = require('stripe')('sk_live_hardcoded_key_123');
const axios = require('axios');

// 1. Payment amount manipulation
function processPayment(req, res) {
  const { amount, currency, cardToken } = req.body;
  
  // No server-side validation of amount
  const charge = stripe.charges.create({
    amount: amount, // Client can send negative or zero amount
    currency: currency,
    source: cardToken
  });
  
  res.json({ success: true, chargeId: charge.id });
}

// 2. Price manipulation via hidden fields
function calculateTotal(items) {
  let total = 0;
  items.forEach(item => {
    // Trusting price from client-side
    total += item.price * item.quantity;
  });
  return total;
}

// 3. Missing payment verification
function fulfillOrder(orderId) {
  // No verification that payment was actually processed
  Order.findByIdAndUpdate(orderId, { status: 'fulfilled' });
  shipOrder(orderId);
}

// 4. Hardcoded payment gateway credentials
const PAYPAL_CONFIG = {
  client_id: 'AeA1QIZXiflr1_-r2lkCDXbXb-w-w-w-w',
  client_secret: 'ELtVxAjhT_YewKBBBbBbBbBbBbBbBbBb',
  mode: 'live' // Production credentials in code
};

// 5. Race condition in payment processing
let processedPayments = new Set();

function processUniquePayment(paymentId, amount) {
  if (processedPayments.has(paymentId)) {
    return { error: 'Payment already processed' };
  }
  
  // Race condition: multiple requests can pass this check
  const result = chargeCard(amount);
  
  if (result.success) {
    processedPayments.add(paymentId);
  }
  
  return result;
}

// 6. Insufficient authorization for refunds
function processRefund(req, res) {
  const { orderId, amount } = req.body;
  
  // No check if user owns the order
  const refund = stripe.refunds.create({
    charge: orderId,
    amount: amount
  });
  
  res.json({ refundId: refund.id });
}

// 7. Payment gateway response manipulation
function handlePaymentCallback(req, res) {
  const { status, orderId, amount } = req.body;
  
  // Trusting payment status from request body
  if (status === 'success') {
    Order.findByIdAndUpdate(orderId, { 
      status: 'paid',
      paidAmount: amount
    });
  }
  
  res.json({ message: 'Payment processed' });
}

// 8. Decimal precision issues
function calculateDiscount(originalPrice, discountPercent) {
  const discount = originalPrice * (discountPercent / 100);
  const finalPrice = originalPrice - discount;
  
  // Using floating point arithmetic for money
  return parseFloat(finalPrice.toFixed(2));
}

module.exports = {
  processPayment,
  calculateTotal,
  fulfillOrder,
  processUniquePayment,
  processRefund,
  handlePaymentCallback,
  calculateDiscount,
  PAYPAL_CONFIG
};