import { useState } from 'react';
import axios from 'axios';
import FloatingHearts from '../components/FloatingHearts';

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({
    username: '',
    displayName: '',
    password: '',
    language: 'en',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = tab === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        tab === 'login'
          ? { username: form.username, password: form.password }
          : { username: form.username, displayName: form.displayName, password: form.password, language: form.language };

      const { data } = await axios.post(endpoint, payload);

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong 💔');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <FloatingHearts />

      <div className="auth-container">
        <div className="auth-card">
          <span className="auth-logo">💕</span>
          <h1 className="auth-title">Our Little World</h1>
          <p className="auth-subtitle">Just you and me, always 🌸</p>

          {/* Tabs */}
          <div className="auth-tabs">
            <button
              id="tab-login"
              className={`auth-tab ${tab === 'login' ? 'active' : ''}`}
              onClick={() => { setTab('login'); setError(''); }}
            >
              Sign In
            </button>
            <button
              id="tab-register"
              className={`auth-tab ${tab === 'register' ? 'active' : ''}`}
              onClick={() => { setTab('register'); setError(''); }}
            >
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-input"
                type="text"
                name="username"
                placeholder="e.g. mudit or sayang"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
              />
            </div>

            {tab === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="displayName">Display Name</label>
                <input
                  id="displayName"
                  className="form-input"
                  type="text"
                  name="displayName"
                  placeholder="Your cute nickname 💖"
                  value={form.displayName}
                  onChange={handleChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="form-input"
                type="password"
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {tab === 'register' && (
              <div className="form-group">
                <label className="form-label" htmlFor="language">Your Language</label>
                <select
                  id="language"
                  className="form-select"
                  name="language"
                  value={form.language}
                  onChange={handleChange}
                >
                  <option value="en">🇬🇧 English (for you)</option>
                  <option value="id">🇮🇩 Indonesian (for her)</option>
                </select>
              </div>
            )}

            {error && <div className="auth-error">{error}</div>}

            <button
              id="btn-submit-auth"
              className="btn-primary"
              type="submit"
              disabled={loading}
            >
              {loading
                ? <span className="spinner" />
                : tab === 'login'
                ? '💕 Enter Our World'
                : '🌸 Create Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
