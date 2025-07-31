const express = require('express');
const app = express();

// Complex Business Logic Security Vulnerabilities

// 1. Negative quantity exploit in cart
app.post('/api/cart/update-item', async (req, res) => {
  const { cartId, itemId, quantity } = req.body;
  
  // No validation for negative quantities
  const cart = await Cart.findById(cartId);
  const item = cart.items.find(i => i.id === itemId);
  
  item.quantity = quantity; // Can be negative
  cart.total = cart.items.reduce((sum, item) => {
    return sum + (item.price * item.quantity); // Negative total possible
  }, 0);
  
  await cart.save();
  res.json({ cart });
});

// 2. Voucher stacking exploit
app.post('/api/checkout/apply-vouchers', async (req, res) => {
  const { orderId, voucherCodes } = req.body;
  const order = await Order.findById(orderId);
  
  let totalDiscount = 0;
  
  // No check for voucher compatibility or stacking rules
  for (const code of voucherCodes) {
    const voucher = await Voucher.findOne({ code });
    if (voucher.type === 'percentage') {
      totalDiscount += order.subtotal * (voucher.value / 100);
    } else {
      totalDiscount += voucher.value;
    }
  }
  
  // Discount can exceed order total
  order.discount = totalDiscount;
  order.total = order.subtotal - totalDiscount;
  await order.save();
  
  res.json({ finalTotal: order.total });
});

// 3. Referral reward infinite loop
app.post('/api/referrals/claim-reward', async (req, res) => {
  const { referrerId, refereeId } = req.body;
  
  // No check for circular referrals or self-referral
  await User.findByIdAndUpdate(referrerId, {
    $inc: { 
      referralPoints: 100,
      wallet: 10
    }
  });
  
  // Can create referral chains: A -> B -> C -> A
  await Referral.create({ referrer: referrerId, referee: refereeId });
  
  res.json({ success: true });
});

// 4. Subscription downgrade refund abuse
app.post('/api/subscriptions/change-plan', async (req, res) => {
  const { subscriptionId, newPlan } = req.body;
  const subscription = await Subscription.findById(subscriptionId);
  
  const oldPlanPrice = subscription.plan.price;
  const newPlanPrice = newPlan.price;
  
  if (newPlanPrice < oldPlanPrice) {
    // Prorated refund without considering usage
    const daysRemaining = (subscription.endDate - Date.now()) / (1000 * 60 * 60 * 24);
    const refund = (oldPlanPrice - newPlanPrice) * (daysRemaining / 30);
    
    // Can repeatedly upgrade/downgrade for profit
    await processRefund(subscription.userId, refund);
  }
  
  subscription.plan = newPlan;
  await subscription.save();
  
  res.json({ subscription });
});

// 5. Flash sale race condition
app.post('/api/flash-sale/purchase', async (req, res) => {
  const { productId, quantity } = req.body;
  
  const flashSale = await FlashSale.findOne({ productId, active: true });
  
  // Race condition - multiple users can exceed limit
  if (flashSale.soldQuantity < flashSale.maxQuantity) {
    flashSale.soldQuantity += quantity;
    await flashSale.save();
    
    // Process order at flash sale price
    await createOrder({
      productId,
      quantity,
      price: flashSale.salePrice
    });
    
    res.json({ success: true });
  }
});

// 6. Loyalty tier manipulation
app.post('/api/loyalty/calculate-tier', async (req, res) => {
  const { userId } = req.body;
  const user = await User.findById(userId);
  
  // Only checks current spend, not time period
  if (user.totalSpend > 10000) {
    user.loyaltyTier = 'platinum';
  } else if (user.totalSpend > 5000) {
    user.loyaltyTier = 'gold';
  }
  
  // Can make large purchase, get benefits, then refund
  await user.save();
  res.json({ tier: user.loyaltyTier });
});

// 7. Bundle pricing logic flaw
app.post('/api/products/calculate-bundle-price', async (req, res) => {
  const { productIds } = req.body;
  
  let totalPrice = 0;
  let bundleDiscount = 0;
  
  for (const id of productIds) {
    const product = await Product.findById(id);
    totalPrice += product.price;
  }
  
  // Bundle discount calculated on original total
  if (productIds.length >= 3) {
    bundleDiscount = totalPrice * 0.2; // 20% off
  }
  
  // Can add free/cheap items to trigger bundle discount
  const finalPrice = totalPrice - bundleDiscount;
  
  res.json({ 
    originalPrice: totalPrice,
    bundlePrice: finalPrice
  });
});

// 8. Reservation double-booking
app.post('/api/reservations/create', async (req, res) => {
  const { resourceId, startTime, endTime } = req.body;
  
  // Soft check without lock
  const conflicts = await Reservation.find({
    resourceId,
    $or: [
      { startTime: { $lt: endTime, $gte: startTime } },
      { endTime: { $gt: startTime, $lte: endTime } }
    ]
  });
  
  if (conflicts.length === 0) {
    // Race condition - another reservation can be created here
    await Reservation.create({
      resourceId,
      startTime,
      endTime,
      userId: req.user.id
    });
    
    res.json({ success: true });
  }
});

// 9. Credit system overflow
app.post('/api/credits/transfer', async (req, res) => {
  const { fromUserId, toUserId, amount } = req.body;
  
  const fromUser = await User.findById(fromUserId);
  const toUser = await User.findById(toUserId);
  
  // No overflow check
  fromUser.credits -= amount; // Can go negative
  toUser.credits += amount; // Can overflow max int
  
  await fromUser.save();
  await toUser.save();
  
  res.json({ success: true });
});

// 10. Tiered pricing boundary exploit
app.post('/api/orders/calculate-tiered-price', async (req, res) => {
  const { quantity } = req.body;
  let pricePerUnit;
  
  // Boundary conditions not handled properly
  if (quantity < 10) {
    pricePerUnit = 10;
  } else if (quantity < 50) {
    pricePerUnit = 8;
  } else if (quantity < 100) {
    pricePerUnit = 6;
  } else {
    pricePerUnit = 5;
  }
  
  // Buying 49 units costs more than 50 units
  const total = quantity * pricePerUnit;
  
  res.json({ total, pricePerUnit });
});

// 11. Marketplace fee bypass
app.post('/api/marketplace/direct-transaction', async (req, res) => {
  const { sellerId, buyerId, amount } = req.body;
  
  // Allows direct transactions bypassing marketplace fees
  await Transaction.create({
    from: buyerId,
    to: sellerId,
    amount: amount,
    type: 'direct_payment',
    fee: 0 // Should be calculating marketplace fee
  });
  
  res.json({ success: true });
});

// 12. Return fraud via status manipulation
app.put('/api/returns/:returnId/status', async (req, res) => {
  const { returnId } = req.params;
  const { status } = req.body;
  
  const return_ = await Return.findById(returnId);
  
  // Can change return status without validation
  return_.status = status;
  
  if (status === 'approved') {
    // Refund without checking if item was received
    await processRefund(return_.userId, return_.refundAmount);
  }
  
  await return_.save();
  res.json({ return: return_ });
});

module.exports = app;