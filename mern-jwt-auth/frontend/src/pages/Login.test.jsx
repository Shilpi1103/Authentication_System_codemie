import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Login from './Login';
import { sendOtp, verifyOtp } from '../services/authService';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../services/authService', () => ({
  loginUser: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  );

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe('Login.jsx OTP UI', () => {
  test('password form and "Login with OTP" link both visible on load (AC-016)', () => {
    renderLogin();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /login with otp/i })).toBeInTheDocument();
  });

  test('after mocked HTTP 200 from sendOtp, OTP input + countdown appear (AC-017)', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: { message: 'OTP sent to your email.' } });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    expect(await screen.findByLabelText(/enter otp/i)).toBeInTheDocument();
    expect(screen.getByText(/Time remaining: 60s/)).toBeInTheDocument();
  });

  test('countdown reaches 0 and stays visible with input still usable (AC-018)', async () => {
    vi.useFakeTimers();
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText(/Time remaining: 0s/)).toBeInTheDocument();
    expect(screen.getByLabelText(/enter otp/i)).toBeEnabled();
  });

  test('mocked HTTP 200 from verifyOtp stores localStorage and navigates (AC-019)', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    verifyOtp.mockResolvedValueOnce({
      status: 200,
      data: { token: 'jwt-token', user: { id: '1', name: 'Jane', email: 'jane@example.com' } },
    });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });
    fireEvent.change(screen.getByLabelText(/enter otp/i), { target: { value: '1234' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    });

    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user'))).toMatchObject({ name: 'Jane' });
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  test('mocked HTTP 401 "incorrect" shows the incorrect-OTP message and keeps input open (AC-020)', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    verifyOtp.mockRejectedValueOnce({
      response: { status: 401, data: { message: 'Incorrect OTP. Please try again.' } },
    });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });
    fireEvent.change(screen.getByLabelText(/enter otp/i), { target: { value: '9999' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    });

    expect(await screen.findByText(/incorrect otp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/enter otp/i)).toBeInTheDocument();
  });

  test('mocked HTTP 401 "expired" shows the expired message (AC-021)', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    verifyOtp.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'No active OTP found, or it has expired, or max attempts reached. Please request a new one.' },
      },
    });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });
    fireEvent.change(screen.getByLabelText(/enter otp/i), { target: { value: '1234' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    });

    expect(await screen.findByText(/expired/i)).toBeInTheDocument();
  });

  test('mocked HTTP 401 "invalidated" resets to the email-entry state (AC-022)', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    verifyOtp.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { message: 'OTP has been invalidated after too many attempts. Please restart.' },
      },
    });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });
    fireEvent.change(screen.getByLabelText(/enter otp/i), { target: { value: '9999' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    });

    expect(await screen.findByText(/invalidated/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/enter otp/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send otp/i })).toBeInTheDocument();
  });

  test('mocked HTTP 429 shows the rate-limit message (AC-023)', async () => {
    sendOtp.mockRejectedValueOnce({
      response: {
        status: 429,
        data: { message: 'Too many OTP requests. Please try again in 10 minutes.' },
      },
    });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    expect(await screen.findByText(/too many otp requests/i)).toBeInTheDocument();
  });
});

describe('Login.jsx KAN-142 inline validation, focus, resend, and a11y', () => {
  test('shows inline error and focuses email input when Send OTP clicked with empty email', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    const emailInput = screen.getByLabelText(/email/i);
    expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    expect(emailInput).toHaveAttribute('aria-invalid', 'true');
    expect(emailInput).toHaveFocus();
    expect(sendOtp).not.toHaveBeenCalled();
  });

  test('shows inline error for a malformed email and clears it once corrected', async () => {
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'not-an-email' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    expect(screen.queryByText(/please enter a valid email address/i)).not.toBeInTheDocument();
  });

  test('focuses the OTP input automatically on entering the verify step', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    expect(await screen.findByLabelText(/enter otp/i)).toHaveFocus();
  });

  test('shows inline error and focuses OTP input when Verify clicked with empty OTP', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    });

    const otpInput = screen.getByLabelText(/enter otp/i);
    expect(screen.getByText(/otp is required/i)).toBeInTheDocument();
    expect(otpInput).toHaveAttribute('aria-invalid', 'true');
    expect(otpInput).toHaveFocus();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  test('shows inline error for an OTP that is not 4 digits', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });
    fireEvent.change(screen.getByLabelText(/enter otp/i), { target: { value: '12' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify otp/i }));
    });

    expect(screen.getByText(/otp must be exactly 4 digits/i)).toBeInTheDocument();
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  test('Resend OTP button is disabled until the countdown reaches 0', async () => {
    vi.useFakeTimers();
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    const resendButton = screen.getByRole('button', { name: /resend otp/i });
    expect(resendButton).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    expect(resendButton).toBeEnabled();
  });

  test('clicking Resend OTP calls sendOtp again and resets the countdown', async () => {
    vi.useFakeTimers();
    sendOtp.mockResolvedValue({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    await act(async () => {
      vi.advanceTimersByTime(60_000);
    });

    const resendButton = screen.getByRole('button', { name: /resend otp/i });
    await act(async () => {
      fireEvent.click(resendButton);
    });

    expect(sendOtp).toHaveBeenCalledTimes(2);
    expect(screen.getByText(/Time remaining: 60s/)).toBeInTheDocument();
    expect(resendButton).toBeDisabled();
    expect(screen.getByLabelText(/enter otp/i)).toHaveValue('');
  });

  test('countdown region has aria-live="polite" and aria-atomic="true" for screen readers', async () => {
    sendOtp.mockResolvedValueOnce({ status: 200, data: {} });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /login with otp/i }));
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'jane@example.com' } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /send otp/i }));
    });

    const countdown = screen.getByText(/Time remaining/);
    expect(countdown).toHaveAttribute('aria-live', 'polite');
    expect(countdown).toHaveAttribute('aria-atomic', 'true');
  });
});
