const express = require('express');
const mongoose = require('mongoose');
const app = express();

// StoreHub Inventory-Specific Security Vulnerabilities

// 1. Stock transfer without source validation
app.post('/api/inventory/transfer', async (req, res) => {
  const { fromBranch, toBranch, items } = req.body;
  
  // No check if fromBranch has sufficient stock
  for (const item of items) {
    await Inventory.findOneAndUpdate(
      { branchId: toBranch, productId: item.productId },
      { $inc: { quantity: item.quantity } }
    );
  }
  
  res.json({ message: 'Transfer completed' });
});

// 2. Cost price manipulation
app.put('/api/inventory/products/:productId/cost', async (req, res) => {
  const { productId } = req.params;
  const { newCost } = req.body;
  
  // No authorization check for cost modification
  await Product.findByIdAndUpdate(productId, {
    cost: newCost,
    lastCostUpdate: Date.now()
  });
  
  res.json({ success: true });
});

// 3. Backdated inventory counts
app.post('/api/inventory/stocktake', async (req, res) => {
  const { date, counts } = req.body;
  
  // Allows backdating stock counts to hide discrepancies
  for (const count of counts) {
    await StockCount.create({
      productId: count.productId,
      quantity: count.quantity,
      countDate: new Date(date), // Can be any past date
      userId: req.user.id
    });
  }
  
  res.json({ message: 'Stock take recorded' });
});

// 4. Purchase order modification after approval
app.put('/api/inventory/purchase-orders/:poId', async (req, res) => {
  const { poId } = req.params;
  const updates = req.body;
  
  // Can modify PO even after approval
  const po = await PurchaseOrder.findByIdAndUpdate(poId, updates, { new: true });
  
  res.json({ purchaseOrder: po });
});

// 5. Supplier catalog price injection
app.post('/api/inventory/suppliers/:supplierId/catalog', async (req, res) => {
  const { supplierId } = req.params;
  const { products } = req.body;
  
  // No validation of supplier ownership
  for (const product of products) {
    await SupplierCatalog.create({
      supplierId,
      productId: product.id,
      price: product.price, // Can set any price
    });
  }
  
  res.json({ message: 'Catalog updated' });
});

// 6. Stock adjustment reason bypass
app.post('/api/inventory/adjust-stock', async (req, res) => {
  const { adjustments } = req.body;
  
  // Generic reason allows hiding theft/loss
  for (const adj of adjustments) {
    await Inventory.findOneAndUpdate(
      { productId: adj.productId },
      { $inc: { quantity: adj.quantity } }
    );
    
    await AdjustmentLog.create({
      productId: adj.productId,
      quantity: adj.quantity,
      reason: adj.reason || 'Adjustment', // Too generic
      userId: req.user.id
    });
  }
  
  res.json({ success: true });
});

// 7. Low stock alert manipulation
app.put('/api/inventory/products/:productId/reorder-point', async (req, res) => {
  const { productId } = req.params;
  const { reorderPoint, reorderQuantity } = req.body;
  
  // Can set reorder point to 0 to prevent alerts
  await Product.findByIdAndUpdate(productId, {
    reorderPoint: reorderPoint,
    reorderQuantity: reorderQuantity
  });
  
  res.json({ success: true });
});

// 8. Recipe/ingredient cost calculation bypass
app.post('/api/inventory/recipes/:recipeId/calculate-cost', async (req, res) => {
  const { recipeId } = req.params;
  const { overrideCosts } = req.body;
  
  // Can override ingredient costs in calculation
  const recipe = await Recipe.findById(recipeId);
  let totalCost = 0;
  
  for (const ingredient of recipe.ingredients) {
    const cost = overrideCosts?.[ingredient.id] || ingredient.cost;
    totalCost += cost * ingredient.quantity;
  }
  
  res.json({ calculatedCost: totalCost });
});

// 9. Expiry date modification
app.put('/api/inventory/batches/:batchId/expiry', async (req, res) => {
  const { batchId } = req.params;
  const { newExpiryDate } = req.body;
  
  // Can extend expiry dates of products
  await Batch.findByIdAndUpdate(batchId, {
    expiryDate: new Date(newExpiryDate)
  });
  
  res.json({ success: true });
});

// 10. Wastage reporting manipulation
app.post('/api/inventory/wastage', async (req, res) => {
  const { items, reason, date } = req.body;
  
  // Can report wastage for any date to hide theft
  for (const item of items) {
    await Wastage.create({
      productId: item.productId,
      quantity: item.quantity,
      reason: reason,
      date: new Date(date || Date.now()),
      reportedBy: req.user.id
    });
    
    // No verification of actual wastage
    await Inventory.decrement(item.productId, item.quantity);
  }
  
  res.json({ message: 'Wastage recorded' });
});

// 11. Vendor return fraud
app.post('/api/inventory/vendor-returns', async (req, res) => {
  const { vendorId, items, refundAmount } = req.body;
  
  // No verification that items were purchased from vendor
  const returnId = await VendorReturn.create({
    vendorId,
    items,
    refundAmount,
    status: 'pending'
  });
  
  // Immediately remove from inventory
  for (const item of items) {
    await Inventory.decrement(item.productId, item.quantity);
  }
  
  res.json({ returnId });
});

// 12. Stock valuation method switching
app.put('/api/inventory/valuation-method', async (req, res) => {
  const { method, retroactive } = req.body;
  
  // Can switch between FIFO/LIFO/Average to manipulate COGS
  await Store.findByIdAndUpdate(req.store.id, {
    inventoryValuationMethod: method
  });
  
  if (retroactive) {
    // Recalculate all historical COGS with new method
    await recalculateAllCOGS(method);
  }
  
  res.json({ message: 'Valuation method updated' });
});

module.exports = app;