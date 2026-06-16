import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Chat from './pages/Chat';
import './index.css';

export default function App() {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);

  // Restore session from localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser  = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.clear();
      }
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Chat user={user} token={token} onLogout={handleLogout} />;
}
