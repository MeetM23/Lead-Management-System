import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../utils/api.js';
import axios from 'axios';

const AuthContext = createContext();

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // 🔹 Restore login on page refresh (JWT-based)
  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await apiFetch('/api/users/me', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (res.ok) {
            const data = await res.json();
            setUser(data.data);
          } else {
            // Token invalid or expired
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          }
        } catch (err) {
          console.error('Failed to fetch user', err);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkLoggedIn();
  }, []);

  // 🔹 Login
  const login = async (email, password) => {
    try {
      setError('');

      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
      const data = res.data;

      // Store JWT
      localStorage.setItem('token', data.token);

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
      return { success: false };
    }
  };

  // 🔹 Register
  const register = async (userData) => {
    try {
      setError('');

      const res = await axios.post(`${API_URL}/api/auth/register`, userData);

      return { success: true };
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed');
      return { success: false };
    }
  };

  // 🔹 Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const updateUser = (updatedUser) => {
    setUser(prev => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        register,
        logout,
        updateUser,
        error,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
