const mongoose = require('mongoose');
const express = require('express');
const redis = require('redis');

// StoreHub Multi-Tenancy Security Vulnerabilities

// 1. Missing tenant isolation in query
app.get('/api/inventory', async (req, res) => {
  // No tenant filtering - exposes all stores' inventory
  const inventory = await Inventory.find({ status: 'active' });
  res.json(inventory);
});

// 2. Cross-store data access via ID manipulation
app.get('/api/stores/:storeId/products', async (req, res) => {
  const { storeId } = req.params;
  // No validation that user belongs to this store
  const products = await Product.find({ storeId });
  res.json(products);
});

// 3. Tenant ID injection in aggregation
app.post('/api/analytics/revenue', async (req, res) => {
  const { tenantId, dateRange } = req.body;
  
  // Direct use of tenant ID allows viewing any tenant's data
  const revenue = await Order.aggregate([
    { $match: { tenantId, createdAt: dateRange } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]);
  
  res.json({ revenue: revenue[0]?.total || 0 });
});

// 4. Shared cache without tenant namespace
const cache = redis.createClient();

async function getCachedData(key) {
  // No tenant prefix - different tenants can access each other's cache
  return await cache.get(key);
}

async function setCachedData(key, value) {
  // Cache pollution across tenants
  await cache.set(key, value, 'EX', 3600);
}

// 5. Branch-level access control bypass
app.put('/api/branches/:branchId/settings', async (req, res) => {
  const { branchId } = req.params;
  const settings = req.body;
  
  // No check if user has access to this specific branch
  await Branch.findByIdAndUpdate(branchId, { settings });
  res.json({ success: true });
});

// 6. Employee cross-store access
app.get('/api/employees/:employeeId/shifts', async (req, res) => {
  const { employeeId } = req.params;
  
  // Employee from one store can see shifts from other stores
  const shifts = await Shift.find({ employeeId });
  res.json(shifts);
});

// 7. Franchise-wide data exposure
app.get('/api/franchise/reports', async (req, res) => {
  const { franchiseId } = req.query;
  
  // No validation of franchise ownership
  const reports = await Report.find({ franchiseId })
    .populate('stores')
    .populate('revenue');
  
  res.json(reports);
});

// 8. Tenant context pollution in middleware
app.use((req, res, next) => {
  // Tenant context stored in global variable - race condition
  global.currentTenant = req.headers['x-tenant-id'];
  next();
});

// 9. Multi-database tenant isolation failure
function getTenantDatabase(tenantId) {
  // Predictable database naming allows guessing other tenant DBs
  return mongoose.connection.useDb(`tenant_${tenantId}`);
}

// 10. Subscription tier bypass
app.post('/api/features/enable', async (req, res) => {
  const { featureId, storeId } = req.body;
  
  // No validation of subscription tier
  await Store.findByIdAndUpdate(storeId, {
    $push: { enabledFeatures: featureId }
  });
  
  res.json({ message: 'Feature enabled' });
});

// 11. Cross-tenant webhook access
app.post('/api/webhooks/register', async (req, res) => {
  const { url, events, tenantId } = req.body;
  
  // Can register webhooks for any tenant
  await Webhook.create({ url, events, tenantId });
  res.json({ success: true });
});

// 12. Shared file storage without isolation
app.get('/api/files/:fileId', async (req, res) => {
  const { fileId } = req.params;
  
  // No tenant validation for file access
  const file = await File.findById(fileId);
  res.sendFile(file.path);
});

module.exports = app;