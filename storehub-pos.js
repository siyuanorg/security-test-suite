const express = require('express');
const app = express();

// StoreHub POS-Specific Security Vulnerabilities

// 1. Cash drawer manipulation
app.post('/api/pos/cash-drawer/open', async (req, res) => {
  const { reason } = req.body;
  
  // No authorization check - any user can open cash drawer
  await CashDrawer.open({ reason, timestamp: Date.now() });
  res.json({ status: 'opened' });
});

// 2. Offline transaction replay attack
app.post('/api/pos/sync/offline-transactions', async (req, res) => {
  const transactions = req.body.transactions;
  
  // No deduplication - same offline transaction can be synced multiple times
  for (const tx of transactions) {
    await Transaction.create(tx);
  }
  
  res.json({ synced: transactions.length });
});

// 3. Receipt modification after sale
app.put('/api/pos/receipts/:receiptId', async (req, res) => {
  const { receiptId } = req.params;
  const updates = req.body;
  
  // Can modify receipt after transaction completed
  await Receipt.findByIdAndUpdate(receiptId, updates);
  res.json({ success: true });
});

// 4. Void transaction without authorization
app.post('/api/pos/transactions/:transactionId/void', async (req, res) => {
  const { transactionId } = req.params;
  const { reason } = req.body;
  
  // No manager approval required for void
  await Transaction.findByIdAndUpdate(transactionId, {
    status: 'voided',
    voidReason: reason,
    voidedAt: Date.now()
  });
  
  res.json({ message: 'Transaction voided' });
});

// 5. Discount manipulation
app.post('/api/pos/apply-discount', async (req, res) => {
  const { orderId, discountPercent } = req.body;
  
  // No limit on discount percentage
  const order = await Order.findById(orderId);
  order.discount = order.total * (discountPercent / 100);
  await order.save();
  
  res.json({ newTotal: order.total - order.discount });
});

// 6. Shift report tampering
app.put('/api/pos/shifts/:shiftId/close', async (req, res) => {
  const { shiftId } = req.params;
  const { cashCount, creditCount } = req.body;
  
  // Can modify cash count when closing shift
  await Shift.findByIdAndUpdate(shiftId, {
    status: 'closed',
    declaredCash: cashCount,
    declaredCredit: creditCount,
    closedAt: Date.now()
  });
  
  res.json({ message: 'Shift closed' });
});

// 7. Employee clock-in manipulation
app.post('/api/pos/timeclock/clockin', async (req, res) => {
  const { employeeId, timestamp } = req.body;
  
  // Can clock in with any timestamp
  await TimeEntry.create({
    employeeId,
    clockIn: timestamp || Date.now(),
    type: 'clock-in'
  });
  
  res.json({ success: true });
});

// 8. Inventory adjustment without audit trail
app.post('/api/pos/inventory/adjust', async (req, res) => {
  const { productId, quantity, reason } = req.body;
  
  // No approval workflow or audit logging
  const product = await Product.findById(productId);
  product.quantity += quantity;
  await product.save();
  
  res.json({ newQuantity: product.quantity });
});

// 9. Customer loyalty point manipulation
app.put('/api/pos/customers/:customerId/points', async (req, res) => {
  const { customerId } = req.params;
  const { points } = req.body;
  
  // Can set any point value without validation
  await Customer.findByIdAndUpdate(customerId, {
    loyaltyPoints: points
  });
  
  res.json({ success: true });
});

// 10. POS terminal session hijacking
const activeSessions = new Map();

app.post('/api/pos/sessions/create', async (req, res) => {
  const { terminalId, userId } = req.body;
  const sessionId = Math.random().toString(36).substr(2, 9);
  
  // Weak session ID, stored in memory without expiration
  activeSessions.set(sessionId, { terminalId, userId });
  
  res.json({ sessionId });
});

// 11. Payment bypass for split bills
app.post('/api/pos/orders/:orderId/split-payment', async (req, res) => {
  const { orderId } = req.params;
  const { payments } = req.body;
  
  // No validation that sum of split payments equals total
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  
  await Order.findByIdAndUpdate(orderId, {
    status: 'paid',
    payments: payments
  });
  
  res.json({ message: 'Payment processed' });
});

// 12. Barcode generation with predictable patterns
app.get('/api/pos/products/:productId/barcode', async (req, res) => {
  const { productId } = req.params;
  
  // Predictable barcode generation
  const barcode = `BAR${productId}${Date.now().toString().slice(-6)}`;
  
  await Product.findByIdAndUpdate(productId, { barcode });
  res.json({ barcode });
});

module.exports = app;