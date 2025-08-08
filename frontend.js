// Client-side JavaScript with security vulnerabilities

// 1. DOM-based XSS
function displayUserGreeting() {
  const name = getUrlParameter('name');
  document.getElementById('greeting').innerHTML = `Hello ${name}!`;
}

// 2. Client-side authentication
function isUserAdmin() {
  const userRole = localStorage.getItem('userRole');
  return userRole === 'admin'; // Can be manipulated by user
}

// 3. Sensitive data in client-side storage
function saveUserData(userData) {
  // Storing sensitive data in localStorage
  localStorage.setItem('creditCard', userData.creditCard);
  localStorage.setItem('ssn', userData.ssn);
  localStorage.setItem('apiKey', userData.apiKey);
}

// 4. Client-side price calculation
function calculateOrderTotal(items) {
  let total = 0;
  items.forEach(item => {
    total += item.price * item.quantity;
  });
  // Total calculated client-side only
  document.getElementById('total').textContent = `$${total}`;
  return total;
}

// 5. Unsafe eval usage
function executeUserScript(script) {
  // Directly executing user-provided code
  eval(script);
}

// 6. Missing CSRF protection
function deleteAccount() {
  // No CSRF token
  fetch('/api/users/delete', {
    method: 'DELETE'
  }).then(response => {
    window.location.href = '/goodbye';
  });
}

// 7. Credentials in source code
const API_CONFIG = {
  endpoint: 'https://api.company.com',
  apiKey: 'pk_live_real_api_key_12345', // Exposed to client
  secretKey: 'sk_live_secret_should_not_be_here'
};

// 8. Insecure random number generation
function generateClientSessionId() {
  return Math.random().toString(36); // Predictable
}

// 9. Client-side business logic
function applyDiscount(originalPrice, userType) {
  let discount = 0;
  
  // Business logic on client-side can be bypassed
  if (userType === 'premium') {
    discount = 0.2; // 20% discount
  } else if (userType === 'employee') {
    discount = 0.5; // 50% discount
  }
  
  return originalPrice * (1 - discount);
}

// 10. Postmessage without origin validation
window.addEventListener('message', function(event) {
  // No origin validation - accepts messages from any domain
  const data = event.data;
  if (data.action === 'updateProfile') {
    updateUserProfile(data.profile);
  }
});

// Helper functions
function getUrlParameter(name) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(name);
}

function updateUserProfile(profile) {
  // Update user profile based on postMessage data
  Object.keys(profile).forEach(key => {
    document.getElementById(key).value = profile[key];
  });
}