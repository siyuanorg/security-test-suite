const express = require('express');
const bcrypt = require('bcrypt');
const app = express();

// StoreHub Employee Management Security Vulnerabilities

// 1. Role privilege escalation
app.put('/api/employees/:employeeId/role', async (req, res) => {
  const { employeeId } = req.params;
  const { newRole } = req.body;
  
  // Employee can change their own role to admin
  await Employee.findByIdAndUpdate(employeeId, {
    role: newRole,
    permissions: getRolePermissions(newRole)
  });
  
  res.json({ message: 'Role updated' });
});

// 2. Commission calculation manipulation
app.post('/api/employees/commission/calculate', async (req, res) => {
  const { employeeId, salesData, customRate } = req.body;
  
  // Can override commission rate in calculation
  const rate = customRate || 0.05;
  const commission = salesData.total * rate;
  
  await Commission.create({
    employeeId,
    amount: commission,
    period: salesData.period,
    rate: rate
  });
  
  res.json({ commission });
});

// 3. Time sheet fraud
app.put('/api/employees/timesheet/:entryId', async (req, res) => {
  const { entryId } = req.params;
  const { clockIn, clockOut } = req.body;
  
  // Can modify own timesheet entries after submission
  await TimeEntry.findByIdAndUpdate(entryId, {
    clockIn: new Date(clockIn),
    clockOut: new Date(clockOut),
    hoursWorked: (new Date(clockOut) - new Date(clockIn)) / 3600000
  });
  
  res.json({ success: true });
});

// 4. Access log tampering
app.delete('/api/employees/access-logs/:logId', async (req, res) => {
  const { logId } = req.params;
  
  // Can delete own suspicious access logs
  await AccessLog.findByIdAndDelete(logId);
  res.json({ message: 'Log deleted' });
});

// 5. Payroll data access
app.get('/api/employees/payroll/all', async (req, res) => {
  // No restriction - any employee can view all payroll data
  const payrollData = await Payroll.find()
    .populate('employee')
    .populate('bankDetails');
  
  res.json(payrollData);
});

// 6. Leave balance manipulation
app.put('/api/employees/:employeeId/leave-balance', async (req, res) => {
  const { employeeId } = req.params;
  const { leaveType, balance } = req.body;
  
  // Can set any leave balance value
  await LeaveBalance.findOneAndUpdate(
    { employeeId, leaveType },
    { balance },
    { upsert: true }
  );
  
  res.json({ success: true });
});

// 7. Emergency contact data exposure
app.get('/api/employees/emergency-contacts', async (req, res) => {
  // Exposes all employees' emergency contact info
  const contacts = await Employee.find()
    .select('name emergencyContacts')
    .lean();
  
  res.json(contacts);
});

// 8. Performance review manipulation
app.post('/api/employees/reviews/:reviewId/submit', async (req, res) => {
  const { reviewId } = req.params;
  const { scores, comments } = req.body;
  
  // Can modify own performance review after submission
  await PerformanceReview.findByIdAndUpdate(reviewId, {
    scores,
    comments,
    submittedAt: Date.now()
  });
  
  res.json({ message: 'Review submitted' });
});

// 9. Training certification fraud
app.post('/api/employees/:employeeId/certifications', async (req, res) => {
  const { employeeId } = req.params;
  const { certification, completionDate } = req.body;
  
  // Can add any certification without verification
  await Certification.create({
    employeeId,
    name: certification,
    completionDate: new Date(completionDate),
    verified: true // Auto-verified
  });
  
  res.json({ success: true });
});

// 10. Employee discount abuse
app.post('/api/employees/apply-discount', async (req, res) => {
  const { orderId, employeeId } = req.body;
  
  // No limit on employee discount usage
  const order = await Order.findById(orderId);
  const employeeDiscount = 0.5; // 50% discount
  
  order.discount = order.total * employeeDiscount;
  order.discountType = 'employee';
  order.discountedBy = employeeId;
  await order.save();
  
  res.json({ newTotal: order.total - order.discount });
});

// 11. Shift swapping without approval
app.post('/api/employees/shifts/swap', async (req, res) => {
  const { fromShiftId, toShiftId, fromEmployee, toEmployee } = req.body;
  
  // No manager approval required for shift swaps
  await Shift.findByIdAndUpdate(fromShiftId, {
    assignedTo: toEmployee
  });
  
  await Shift.findByIdAndUpdate(toShiftId, {
    assignedTo: fromEmployee
  });
  
  res.json({ message: 'Shifts swapped' });
});

// 12. Termination bypass
app.post('/api/employees/:employeeId/reinstate', async (req, res) => {
  const { employeeId } = req.params;
  
  // Terminated employee can reinstate themselves
  await Employee.findByIdAndUpdate(employeeId, {
    status: 'active',
    terminationDate: null,
    terminationReason: null,
    accessRevoked: false
  });
  
  // Re-enable all system access
  await SystemAccess.restore(employeeId);
  
  res.json({ message: 'Employee reinstated' });
});

module.exports = app;