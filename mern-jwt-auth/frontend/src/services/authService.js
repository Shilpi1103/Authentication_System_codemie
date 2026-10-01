import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Returns the Authorization header with the stored JWT token
const authHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
});

export const registerUser = (data) => axios.post(`${API_URL}/auth/register`, data);

export const loginUser = (data) => axios.post(`${API_URL}/auth/login`, data);

export const getProfile = () => axios.get(`${API_URL}/auth/profile`, authHeader());

export const sendOtp = (data) => axios.post(`${API_URL}/auth/otp/send`, data);

export const verifyOtp = (data) => axios.post(`${API_URL}/auth/otp/verify`, data);
