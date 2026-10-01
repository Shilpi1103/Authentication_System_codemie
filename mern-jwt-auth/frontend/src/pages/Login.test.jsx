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
