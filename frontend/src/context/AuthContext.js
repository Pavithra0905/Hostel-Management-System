/**
 * AUTHENTICATION CONTEXT
 * Manages user authentication state across the application
 */

import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const normalizeStudentFlags = (userData, sourceData = {}) => {
  const hostelFee = Number(
    userData?.hostelFee ??
    sourceData?.hostelFee ??
    5000
  );

  const isExService = Boolean(
    userData?.isExService ??
    sourceData?.isExService ??
    hostelFee === 0
  );

  const isCurrentStaff = Boolean(
    userData?.isCurrentStaff ??
    sourceData?.isCurrentStaff ??
    (!isExService && hostelFee === 2500)
  );

  return {
    ...userData,
    isExService,
    isCurrentStaff,
    hostelFee: isExService ? 0 : isCurrentStaff ? 2500 : hostelFee
  };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on mount
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);
  }, []);

  // Login function
  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password });
      
      if (response.data.success) {
        const { token, ...rawUserData } = response.data.data;
        const userData = normalizeStudentFlags(rawUserData, rawUserData);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        setUser(userData);
        
        return { success: true, data: userData };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Login failed'
      };
    }
  };

  // Register function
  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData);
      
      if (response.data.success) {
        const { token, ...rawUser } = response.data.data;
        const user = normalizeStudentFlags(rawUser, userData);
        
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        setUser(user);
        
        return { success: true, data: user };
      }
      
      return { success: false, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || 'Registration failed'
      };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export default AuthContext;
