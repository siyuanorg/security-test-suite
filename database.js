const mongoose = require('mongoose');
const mysql = require('mysql2');
const { MongoClient } = require('mongodb');

// 1. MongoDB NoSQL injection
function findUser(username, password) {
  const query = {
    username: username,
    password: password
  };
  // Vulnerable to: {"username": {"$ne": null}, "password": {"$ne": null}}
  return User.findOne(query);
}

// 2. SQL injection in dynamic WHERE clause
function searchProducts(filters) {
  let whereClause = '1=1';
  
  if (filters.category) {
    whereClause += ` AND category = '${filters.category}'`; // SQL injection
  }
  
  if (filters.price_min) {
    whereClause += ` AND price >= ${filters.price_min}`; // SQL injection
  }
  
  const query = `SELECT * FROM products WHERE ${whereClause}`;
  return db.query(query);
}

// 3. MongoDB $where injection
function findOrdersWithCustomCondition(condition) {
  return Order.find({ $where: condition }); // JavaScript injection
}

// 4. Raw MongoDB query construction
function getUsersByRole(role) {
  const pipeline = [
    { $match: { role: role } }, // Can inject objects like {$ne: null}
    { $lookup: {
        from: 'permissions',
        localField: 'roleId',
        foreignField: '_id',
        as: 'permissions'
      }
    }
  ];
  return User.aggregate(pipeline);
}

// 5. SQL injection in LIMIT clause
function getRecentOrders(limit) {
  const query = `SELECT * FROM orders ORDER BY created_at DESC LIMIT ${limit}`;
  return db.query(query); // Can inject: "1; DROP TABLE orders; --"
}

// 6. Database connection with admin privileges
const adminDb = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'admin123',
  database: 'store'
});

// 7. Exposed database credentials
const DB_CONFIG = {
  host: 'prod-db.company.com',
  user: 'admin',
  password: 'SuperSecret123!', // Hardcoded in source
  database: 'production'
};

// 8. MongoDB injection in aggregation pipeline
function getAnalytics(userInput) {
  const pipeline = [
    { $match: userInput }, // Directly using user input
    { $group: {
        _id: '$category',
        total: { $sum: '$amount' }
      }
    }
  ];
  return Analytics.aggregate(pipeline);
}

// 9. SQL injection in stored procedure call
function callStoredProcedure(userId, action) {
  const query = `CALL user_action_log('${userId}', '${action}')`;
  return db.query(query); // Injectable via action parameter
}

// 10. Mass assignment to database model
function updateUserProfile(userId, profileData) {
  // No field filtering - can modify any user field
  return User.findByIdAndUpdate(userId, profileData, { new: true });
}

module.exports = {
  findUser,
  searchProducts,
  findOrdersWithCustomCondition,
  getUsersByRole,
  getRecentOrders,
  getAnalytics,
  callStoredProcedure,
  updateUserProfile,
  DB_CONFIG
};