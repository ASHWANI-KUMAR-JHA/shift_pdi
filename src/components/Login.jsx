import { useState } from 'react';
import { validateCredentials, setSession } from '../utils/auth';
import Logo from './Logo';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!identifier || !password) {
      setError('Please enter your email or mobile number and password.');
      setLoading(false);
      return;
    }

    try {
      const user = await validateCredentials(identifier, password);
      if (user) {
        setSession(user);
        onLoginSuccess();
      } else {
        setError('Invalid email / mobile number or password.');
      }
    } catch (err) {
      setError(err?.code === 'INACTIVE'
        ? err.message
        : 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <Logo />
          <h1 className="login-title">Welcome to Sunfeed</h1>
          <p className="login-subtitle">Sign in to access your workspace</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <label htmlFor="identifier">Email or Mobile Number</label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="Enter your email or mobile number"
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-field">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div className="login-error" role="alert">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          <p>Powered by SUNFEED ECOSOLUTIONS</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
