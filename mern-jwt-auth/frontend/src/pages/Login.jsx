import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, sendOtp, verifyOtp } from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // OTP login state (FR-016–FR-020)
  const [otpStep, setOtpStep] = useState('password');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [otpMessage, setOtpMessage] = useState({ text: '', type: '' });
  const [otpLoading, setOtpLoading] = useState(false);

  useEffect(() => {
    if (otpStep !== 'otp-verify') return undefined;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep]);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { email, password } = formData;

    if (!email || !password) {
      return setMessage({ text: 'Please fill in all required fields.', type: 'error' });
    }

    setLoading(true);
    try {
      const res = await loginUser({ email, password });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setMessage({ text: 'Login successful!', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (err) {
      setMessage({
        text: err.response?.data?.message || 'Login failed. Please try again.',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetToPassword = () => {
    setOtpStep('password');
    setOtpEmail('');
    setOtpValue('');
    setOtpMessage({ text: '', type: '' });
  };

  const otpErrorMessage = (status, serverMessage) => {
    if (status === 400 && /valid email/i.test(serverMessage || '')) {
      return 'Please enter a valid email address.';
    }
    if (status === 400) {
      return serverMessage || 'Please enter a valid email address.';
    }
    if (status === 404) {
      return 'This email is not registered.';
    }
    if (status === 429) {
      return 'Too many OTP requests. Please try again in 10 minutes.';
    }
    if (status === 500) {
      return 'Failed to send OTP. Please try again.';
    }
    return serverMessage || 'An unexpected error occurred.';
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!otpEmail) {
      return setOtpMessage({ text: 'Please enter a valid email address.', type: 'error' });
    }

    setOtpLoading(true);
    try {
      await sendOtp({ email: otpEmail });
      setOtpMessage({ text: '', type: '' });
      setCountdown(60);
      setOtpStep('otp-verify');
    } catch (err) {
      const status = err.response?.status;
      setOtpMessage({
        text: otpErrorMessage(status, err.response?.data?.message),
        type: 'error',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(otpValue)) {
      return setOtpMessage({ text: 'OTP must be exactly 4 digits.', type: 'error' });
    }

    setOtpLoading(true);
    try {
      const res = await verifyOtp({ email: otpEmail, otp: otpValue });
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      setOtpMessage({ text: 'Login successful!', type: 'success' });
      navigate('/dashboard');
    } catch (err) {
      const serverMessage = err.response?.data?.message || 'An unexpected error occurred.';
      if (/invalidated/i.test(serverMessage)) {
        // AC-022: attempts exhausted — restart from email entry
        setOtpStep('otp-email');
        setOtpValue('');
      }
      setOtpMessage({ text: serverMessage, type: 'error' });
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>

        {otpStep === 'password' && (
          <>
            {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </form>
            <p className="auth-link">
              <button type="button" className="link-button" onClick={() => setOtpStep('otp-email')}>
                Login with OTP
              </button>
            </p>
            <p className="auth-link">
              Don&apos;t have an account? <Link to="/register">Register</Link>
            </p>
          </>
        )}

        {otpStep === 'otp-email' && (
          <>
            {otpMessage.text && <p className={`message ${otpMessage.type}`}>{otpMessage.text}</p>}
            <form onSubmit={handleSendOtp} noValidate>
              <div className="form-group">
                <label htmlFor="otpEmail">Email</label>
                <input
                  id="otpEmail"
                  type="email"
                  name="otpEmail"
                  placeholder="Enter your email"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                />
              </div>
              <button type="submit" className="btn-primary" disabled={otpLoading}>
                {otpLoading ? 'Sending...' : 'Send OTP'}
              </button>
            </form>
            <p className="auth-link">
              <button type="button" className="link-button" onClick={resetToPassword}>
                Back
              </button>
            </p>
          </>
        )}

        {otpStep === 'otp-verify' && (
          <>
            {otpMessage.text && <p className={`message ${otpMessage.type}`}>{otpMessage.text}</p>}
            <form onSubmit={handleVerifyOtp} noValidate>
              <div className="form-group">
                <label htmlFor="otpValue">Enter OTP</label>
                <input
                  id="otpValue"
                  type="text"
                  name="otpValue"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="4-digit OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value)}
                />
              </div>
              <p className="countdown">Time remaining: {countdown}s</p>
              <button type="submit" className="btn-primary" disabled={otpLoading}>
                {otpLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
            <p className="auth-link">
              <button type="button" className="link-button" onClick={resetToPassword}>
                Back
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
