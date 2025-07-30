const { MongoClient } = require('mongodb');
const mysql = require('mysql2');
const redis = require('redis');

// 🚨 VULNERABILITY 1: Multiple hardcoded database credentials (Critical)
const MONGO_PROD_URL = 'mongodb://siyuan_admin:Pr0d_P@ssw0rd_2024@prod-cluster.mongodb.net:27017/siyuan_production';
const MONGO_STAGING_URL = 'mongodb://staging_user:St4g1ng_P@ss@staging-db:27017/siyuan_staging';

const MYSQL_PROD_CONFIG = {
  host: 'prod-mysql.siyuanorg.com',
  user: 'root',
  password: 'mysql_root_password_2024',
  database: 'siyuan_prod',
  port: 3306
};

const REDIS_CONFIG = {
  host: 'redis-cluster.siyuanorg.com',
  port: 6379,
  password: 'redis_auth_password_123'
};

// 🚨 VULNERABILITY 2: NoSQL injection with business logic bypass (Critical)
async function findUserWithCredentials(email, password, accountType) {
  const client = new MongoClient(MONGO_PROD_URL);
  await client.connect();
  
  const db = client.db('siyuan_production');
  
  // Direct object insertion allows sophisticated NoSQL injection
  const user = await db.collection('users').findOne({
    email: email,
    password: password, // Should be hashed comparison
    accountType: accountType, // Can be bypassed with $ne: null
    isActive: true // Can be bypassed
  });
  
  await client.close();
  return user;
}

// 🚨 VULNERABILITY 3: SQL injection with union-based attack vector (Critical)
function getUsersWithRole(role, department, limit) {
  const connection = mysql.createConnection(MYSQL_PROD_CONFIG);
  
  // String concatenation allows advanced SQL injection
  const query = `
    SELECT u.id, u.email, u.role, u.department, u.salary, u.ssn 
    FROM users u 
    WHERE u.role = '${role}' 
    AND u.department = '${department}'
    ORDER BY u.id 
    LIMIT ${limit}
  `;
  
  return new Promise((resolve, reject) => {
    connection.execute(query, (error, results) => {
      if (error) {
        reject(error);
      } else {
        resolve(results);
      }
      connection.end();
    });
  });
}

// 🚨 VULNERABILITY 4: Direct object reference with privilege escalation (High)
async function getOrderWithDetails(orderId, userId, accessLevel) {
  const client = new MongoClient(MONGO_PROD_URL);
  await client.connect();
  
  const db = client.db('siyuan_production');
  
  // No proper authorization - any user can access any order
  // Plus business logic flaw with accessLevel
  let query = { _id: orderId };
  
  if (accessLevel !== 'admin') {
    // Insufficient access control
    query.userId = userId; // Can be bypassed with $ne
  }
  
  const order = await db.collection('orders').findOne(query);
  
  // Return sensitive financial data
  if (order) {
    order.creditCardInfo = {
      number: '4111-1111-1111-1111',
      cvv: '123',
      expiryDate: '12/25'
    };
  }
  
  await client.close();
  return order;
}

// 🚨 VULNERABILITY 5: Advanced NoSQL injection in aggregation pipeline (Critical)
async function getRevenueAnalytics(startDate, endDate, groupByField, filterConditions) {
  const client = new MongoClient(MONGO_PROD_URL);
  await client.connect();
  
  const db = client.db('siyuan_production');
  
  // Dynamic aggregation pipeline construction - highly vulnerable
  let pipeline = [
    {
      $match: {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      }
    }
  ];
  
  // Add user-controlled filter conditions
  if (filterConditions) {
    pipeline.push({ $match: JSON.parse(filterConditions) }); // Direct JSON parsing!
  }
  
  // User-controlled grouping
  if (groupByField) {
    pipeline.push({
      $group: JSON.parse(groupByField) // Another injection point
    });
  }
  
  const results = await db.collection('orders').aggregate(pipeline).toArray();
  
  await client.close();
  return results;
}

// 🚨 VULNERABILITY 6: Price manipulation with business logic flaws (Critical)
async function updateProductPricing(productId, priceData, userId, userRole) {
  const client = new MongoClient(MONGO_PROD_URL);
  await client.connect();
  
  const db = client.db('siyuan_production');
  
  // Business logic flaw - insufficient authorization
  if (userRole === 'employee' || userRole === 'manager') {
    // Employees can manipulate prices!
    const result = await db.collection('products').updateOne(
      { _id: productId },
      { 
        $set: {
          price: priceData.newPrice, // No validation
          salePrice: priceData.salePrice, // Can be higher than regular price
          cost: priceData.cost, // Can be manipulated for profit calculation
          lastModifiedBy: userId,
          lastModified: new Date()
        }
      }
    );
    
    await client.close();
    return result;
  }
  
  throw new Error('Unauthorized');
}

// 🚨 VULNERABILITY 7: Inventory manipulation with negative stock bypass (High)
async function adjustProductInventory(productId, adjustmentData, reason, overrideChecks) {
  const client = new MongoClient(MONGO_PROD_URL);
  await client.connect();
  
  const db = client.db('siyuan_production');
  
  let updateOperation = {
    $inc: { stock: adjustmentData.quantity }, // Can be negative
    $push: {
      stockHistory: {
        change: adjustmentData.quantity,
        reason: reason,
        timestamp: new Date(),
        user: adjustmentData.userId
      }
    }
  };
  
  // Override checks bypass
  if (overrideChecks === 'true') {
    // Allow negative stock
    updateOperation.$set = { stock: adjustmentData.quantity };
  }
  
  const result = await db.collection('products').updateOne(
    { _id: productId },
    updateOperation
  );
  
  await client.close();
  return result;
}

// 🚨 VULNERABILITY 8: Cross-tenant data access vulnerability (High)
async function getUserDataByTenant(userId, tenantId, includePersonalData) {
  const client = new MongoClient(MONGO_PROD_URL);
  await client.connect();
  
  const db = client.db('siyuan_production');
  
  let query = { userId: userId };
  
  // Missing tenant isolation!
  if (tenantId && tenantId !== 'all') {
    query.tenantId = tenantId; // Can be bypassed with 'all'
  }
  
  let projection = { password: 0 }; // Hide password but not other sensitive data
  
  if (includePersonalData === 'true') {
    projection = {}; // Include everything including passwords!
  }
  
  const userData = await db.collection('users').find(query, { projection }).toArray();
  
  await client.close();
  return userData;
}

// 🚨 VULNERABILITY 9: Database connection info disclosure (Medium)
function getDatabaseConnectionInfo(includeCredentials) {
  const info = {
    mongodb: {
      host: 'prod-cluster.mongodb.net',
      database: 'siyuan_production',
      collections: ['users', 'orders', 'products', 'payments'],
      version: '4.4.0'
    },
    mysql: {
      host: MYSQL_PROD_CONFIG.host,
      database: MYSQL_PROD_CONFIG.database,
      version: '8.0.25'
    },
    redis: {
      host: REDIS_CONFIG.host,
      port: REDIS_CONFIG.port
    }
  };
  
  if (includeCredentials === 'true') {
    // Exposing credentials!
    info.mongodb.credentials = {
      username: 'siyuan_admin',
      password: 'Pr0d_P@ssw0rd_2024',
      connectionString: MONGO_PROD_URL
    };
    
    info.mysql.credentials = MYSQL_PROD_CONFIG;
    info.redis.credentials = REDIS_CONFIG;
  }
  
  return info;
}

// 🚨 VULNERABILITY 10: Redis cache poisoning vulnerability (Medium)
async function setCacheData(key, data, ttl, namespace) {
  const client = redis.createClient(REDIS_CONFIG);
  await client.connect();
  
  // No key sanitization - cache poisoning possible
  const fullKey = `${namespace}:${key}`; // Namespace can contain malicious patterns
  
  // No data validation
  await client.setEx(fullKey, ttl || 3600, JSON.stringify(data));
  
  await client.disconnect();
  return { success: true, key: fullKey };
}

module.exports = {
  findUserWithCredentials,
  getUsersWithRole,
  getOrderWithDetails,
  getRevenueAnalytics,
  updateProductPricing,
  adjustProductInventory,
  getUserDataByTenant,
  getDatabaseConnectionInfo,
  setCacheData
};