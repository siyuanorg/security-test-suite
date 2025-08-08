import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';

// React-Specific Security Vulnerabilities

// 1. dangerouslySetInnerHTML with user input
function CommentDisplay({ comment }) {
  return (
    <div 
      dangerouslySetInnerHTML={{ __html: comment.content }}
    />
  );
}

// 2. href with javascript: protocol
function UserLink({ user }) {
  return (
    <a href={user.website}>
      Visit {user.name}'s website
    </a>
  );
}

// 3. Storing sensitive data in React state
function PaymentForm() {
  const [creditCard, setCreditCard] = useState('');
  const [cvv, setCvv] = useState('');
  const [pin, setPin] = useState('');

  // Sensitive data exposed in React DevTools
  return (
    <form>
      <input 
        value={creditCard} 
        onChange={(e) => setCreditCard(e.target.value)}
      />
      <input 
        value={cvv}
        onChange={(e) => setCvv(e.target.value)}
      />
    </form>
  );
}

// 4. Eval in React component
function DynamicComponent({ userScript }) {
  useEffect(() => {
    // Executing user-provided scripts
    eval(userScript);
  }, [userScript]);

  return <div id="dynamic-content" />;
}

// 5. XSS via component props
function ProductCard({ product }) {
  return (
    <div>
      <h2>{product.name}</h2>
      <div className={product.className}>
        <span style={product.customStyles}>
          {product.price}
        </span>
      </div>
    </div>
  );
}

// 6. Unvalidated redirect
function LoginRedirect() {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const redirectUrl = urlParams.get('redirect');
    
    // Open redirect vulnerability
    if (redirectUrl) {
      window.location.href = redirectUrl;
    }
  }, []);

  return <div>Redirecting...</div>;
}

// 7. Client-side authorization
function AdminPanel() {
  const [user] = useState(JSON.parse(localStorage.getItem('user')));

  // Authorization check only on client
  if (user?.role !== 'admin') {
    return <div>Access Denied</div>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      <DeleteAllUsersButton />
    </div>
  );
}

// 8. Exposed API keys in React
const API_CONFIG = {
  GOOGLE_MAPS_KEY: 'AIzaSyC_real_key_exposed_in_bundle',
  STRIPE_PUBLIC_KEY: 'pk_live_actual_public_key',
  FIREBASE_API_KEY: 'firebase_secret_key_here',
  AWS_ACCESS_KEY: 'AKIAIOSFODNN7EXAMPLE'
};

// 9. React Portal to body without sanitization
function UnsafeModal({ isOpen, content }) {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div dangerouslySetInnerHTML={{ __html: content }} />,
    document.body
  );
}

// 10. File upload without validation
function FileUploader() {
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    
    // No file type or size validation
    const reader = new FileReader();
    reader.onload = (e) => {
      // Directly using file content
      document.getElementById('preview').innerHTML = e.target.result;
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <input type="file" onChange={handleFileUpload} />
      <div id="preview" />
    </div>
  );
}

// 11. useEffect with missing dependencies exposing sensitive data
function UserProfile({ userId }) {
  const [userData, setUserData] = useState(null);
  const [apiKey] = useState('secret_api_key');

  useEffect(() => {
    // apiKey exposed in network requests
    fetch(`/api/users/${userId}?key=${apiKey}`)
      .then(res => res.json())
      .then(setUserData);
  }, []); // Missing userId dependency

  return <div>{userData?.name}</div>;
}

// 12. Local storage for auth tokens
function AuthManager() {
  const login = async (credentials) => {
    const response = await fetch('/api/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    
    const { token, refreshToken } = await response.json();
    
    // Tokens vulnerable to XSS
    localStorage.setItem('authToken', token);
    localStorage.setItem('refreshToken', refreshToken);
  };

  return <LoginForm onSubmit={login} />;
}

// 13. Server-side rendering with user input
function SSRComponent({ userInput }) {
  return (
    <script dangerouslySetInnerHTML={{
      __html: `window.__USER_DATA__ = ${JSON.stringify(userInput)};`
    }} />
  );
}

// 14. Prototype pollution in React component
function ConfigurableComponent({ config }) {
  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Vulnerable to prototype pollution
    for (let key in config) {
      settings[key] = config[key];
    }
  }, [config]);

  return <div>{settings.toString()}</div>;
}

// 15. postMessage without origin validation in React
function MessageReceiver() {
  useEffect(() => {
    window.addEventListener('message', (event) => {
      // No origin validation
      if (event.data.type === 'UPDATE_STATE') {
        setState(event.data.payload);
      }
    });
  }, []);

  return <div>Listening for messages...</div>;
}