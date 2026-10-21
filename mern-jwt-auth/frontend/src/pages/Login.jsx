import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, sendOtp, verifyOtp } from '../services/authService';

function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);

  // OTP login state (FR-016 to FR-020)
  const [otpStep, setOtpStep] = useState('password');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [otpMessage, setOtpMessage] = useState({ text: '', type: '' });
  const [otpLoading, setOtpLoading] = useState(false);

  // Inline per-field validation state (KAN-142)
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendEnabled, setResendEnabled] = useState(false);

  // Focus management refs (KAN-142)
  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);

  // Countdown ticking - unchanged behaviour, runs while in the verify step.
  useEffect(() => {
    if (otpStep !== 'otp-verify') return undefined;
    const interval = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [otpStep]);

  // Enable the Resend OTP button once the countdown reaches 0 (KAN-142).
  useEffect(() => {
    if (otpStep !== 'otp-verify') {
      setResendEnabled(false);
      return;
    }
    setResendEnabled(countdown <= 0);
  }, [countdown, otpStep]);

  // Focus the OTP input as soon as the user reaches the verify step (KAN-142).
  useEffect(() => {
    if (otpStep === 'otp-verify') {
      otpInputRef.current?.focus();
    }
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
    setEmailError('');
    setOtpError('');
    setResendEnabled(false);
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

  // Inline validation helpers (KAN-142)
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required.';
    if (!emailRegex.test(email)) return 'Please enter a valid email address.';
    return '';
  };

  const validateOtp = (otp) => {
    if (!otp) return 'OTP is required.';
    if (!/^\d{4}$/.test(otp)) return 'OTP must be exactly 4 digits.';
    return '';
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const validationError = validateEmail(otpEmail);
    if (validationError) {
      setEmailError(validationError);
      emailInputRef.current?.focus();
      return;
    }
    setEmailError('');

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
    const validationError = validateOtp(otpValue);
    if (validationError) {
      setOtpError(validationError);
      otpInputRef.current?.focus();
      return;
    }
    setOtpError('');

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
        // AC-022: attempts exhausted - restart from email entry
        setOtpStep('otp-email');
        setOtpValue('');
        setOtpError('');
      }
      setOtpMessage({ text: serverMessage, type: 'error' });
    } finally {
      setOtpLoading(false);
    }
  };

  // Explicit Resend OTP control (KAN-142), enabled once countdown reaches 0.
  const handleResendOtp = async () => {
    setOtpError('');
    setOtpValue('');
    setOtpLoading(true);
    try {
      await sendOtp({ email: otpEmail });
      setCountdown(60);
      setResendEnabled(false);
      setOtpMessage({ text: 'OTP resent successfully!', type: 'success' });
      otpInputRef.current?.focus();
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
                  ref={emailInputRef}
                  id="otpEmail"
                  type="email"
                  name="otpEmail"
                  placeholder="Enter your email"
                  value={otpEmail}
                  onChange={(e) => {
                    setOtpEmail(e.target.value);
                    setEmailError('');
                  }}
                  aria-invalid={emailError ? 'true' : 'false'}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
                {emailError && (
                  <span id="email-error" className="inline-error" role="alert">
                    {emailError}
                  </span>
                )}
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
                  ref={otpInputRef}
                  id="otpValue"
                  type="text"
                  name="otpValue"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  placeholder="4-digit OTP"
                  maxLength="4"
                  value={otpValue}
                  onChange={(e) => {
                    setOtpValue(e.target.value);
                    setOtpError('');
                  }}
                  aria-invalid={otpError ? 'true' : 'false'}
                  aria-describedby={otpError ? 'otp-error' : 'countdown-timer'}
                />
                {otpError && (
                  <span id="otp-error" className="inline-error" role="alert">
                    {otpError}
                  </span>
                )}
              </div>
              <p
                id="countdown-timer"
                className="countdown"
                aria-live="polite"
                aria-atomic="true"
              >
                Time remaining: {countdown}s
              </p>
              <button type="submit" className="btn-primary" disabled={otpLoading}>
                {otpLoading ? 'Verifying...' : 'Verify OTP'}
              </button>
              <button
                type="button"
                className="btn-resend"
                onClick={handleResendOtp}
                disabled={!resendEnabled || otpLoading}
              >
                Resend OTP
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
