const redis = require('redis');
const mongoose = require('mongoose');
const express = require('express');
const app = express();

// Redis & Mongoose Advanced Security Vulnerabilities

// Redis Vulnerabilities

// 1. Redis command injection via Lua scripts
app.post('/api/redis/eval-script', async (req, res) => {
  const { script, keys, args } = req.body;
  const client = redis.createClient();
  
  // Direct execution of user-provided Lua script
  client.eval(script, keys.length, ...keys, ...args, (err, result) => {
    res.json({ result });
  });
});

// 2. Unprotected Redis pub/sub channels
app.post('/api/redis/publish', async (req, res) => {
  const { channel, message } = req.body;
  const client = redis.createClient();
  
  // Can publish to any channel including admin channels
  client.publish(channel, JSON.stringify(message));
  res.json({ success: true });
});

// 3. Redis key pattern injection
app.get('/api/redis/keys/:pattern', async (req, res) => {
  const { pattern } = req.params;
  const client = redis.createClient();
  
  // Pattern injection can expose all keys
  client.keys(pattern, (err, keys) => {
    res.json({ keys });
  });
});

// 4. Unsafe Redis transaction handling
app.post('/api/redis/transfer-points', async (req, res) => {
  const { fromUser, toUser, points } = req.body;
  const client = redis.createClient();
  
  // Race condition - no proper transaction isolation
  const fromPoints = await client.get(`points:${fromUser}`);
  const toPoints = await client.get(`points:${toUser}`);
  
  client.set(`points:${fromUser}`, fromPoints - points);
  client.set(`points:${toUser}`, toPoints + points);
  
  res.json({ success: true });
});

// 5. Redis cluster command injection
app.post('/api/redis/cluster-meet', async (req, res) => {
  const { ip, port } = req.body;
  const client = redis.createClient({ cluster: true });
  
  // Can add arbitrary nodes to cluster
  client.cluster('MEET', ip, port);
  res.json({ message: 'Node added to cluster' });
});

// Mongoose Vulnerabilities

// 6. Mongoose query selector injection
app.get('/api/users/search', async (req, res) => {
  const searchQuery = req.query.q;
  
  // Vulnerable to operator injection like {$ne: null}
  const users = await User.find({
    $or: [
      { username: searchQuery },
      { email: searchQuery }
    ]
  });
  
  res.json(users);
});

// 7. Mongoose schema bypass with strict: false
const FlexibleSchema = new mongoose.Schema({}, { 
  strict: false,
  collection: 'sensitive_data'
});

app.post('/api/flexible-data', async (req, res) => {
  // Can insert any fields including __proto__
  const data = new FlexibleModel(req.body);
  await data.save();
  res.json({ success: true });
});

// 8. Mongoose populate injection
app.get('/api/orders/:orderId', async (req, res) => {
  const { orderId } = req.params;
  const { populate } = req.query;
  
  // Can populate any path including sensitive ones
  const order = await Order.findById(orderId).populate(populate);
  res.json(order);
});

// 9. Mongoose aggregation pipeline injection
app.post('/api/analytics/custom', async (req, res) => {
  const { pipeline } = req.body;
  
  // Direct execution of user-provided pipeline
  const results = await Analytics.aggregate(pipeline);
  res.json(results);
});

// 10. Mongoose discriminator bypass
const BaseSchema = new mongoose.Schema({
  type: String,
  data: mongoose.Mixed
});

const AdminDoc = BaseSchema.discriminator('Admin', new mongoose.Schema({
  superSecret: String
}));

app.post('/api/documents', async (req, res) => {
  // Can set discriminatorKey to access admin schema
  const doc = new BaseModel(req.body);
  await doc.save();
  res.json(doc);
});

// 11. Redis Lua sandbox escape
app.post('/api/redis/safe-eval', async (req, res) => {
  const { userScript } = req.body;
  const client = redis.createClient();
  
  // Attempting to sanitize but still vulnerable
  const wrappedScript = `
    local sandbox = {}
    setmetatable(sandbox, {__index = _G})
    setfenv(function() ${userScript} end, sandbox)()
  `;
  
  client.eval(wrappedScript, 0, (err, result) => {
    res.json({ result });
  });
});

// 12. Mongoose cursor memory exhaustion
app.get('/api/export/all-data', async (req, res) => {
  // No limit on cursor size - memory DoS
  const cursor = User.find({}).cursor();
  const results = [];
  
  cursor.on('data', (doc) => {
    results.push(doc);
  });
  
  cursor.on('end', () => {
    res.json(results);
  });
});

// 13. Redis sorted set score manipulation
app.post('/api/leaderboard/update-score', async (req, res) => {
  const { userId, score } = req.body;
  const client = redis.createClient();
  
  // Can set any score including Infinity or negative
  client.zadd('leaderboard', score, userId);
  res.json({ success: true });
});

// 14. Mongoose session injection
app.post('/api/transfer-ownership', async (req, res) => {
  const { fromId, toId, assetId } = req.body;
  
  // No session validation - can use any session
  const session = await mongoose.startSession();
  
  await session.withTransaction(async () => {
    await Asset.findByIdAndUpdate(assetId, { owner: toId }, { session });
    await User.findByIdAndUpdate(fromId, { $pull: { assets: assetId } }, { session });
    await User.findByIdAndUpdate(toId, { $push: { assets: assetId } }, { session });
  });
  
  res.json({ success: true });
});

// 15. Redis memory command abuse
app.post('/api/redis/debug', async (req, res) => {
  const { command } = req.body;
  const client = redis.createClient();
  
  // Can execute memory/debug commands
  client.send_command(command, (err, result) => {
    res.json({ result });
  });
});

module.exports = app;