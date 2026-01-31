import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { loginUser, signupUser } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, role: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => Promise<{ success: boolean; message?: string }>;
  updateUser: (updatedUserData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        try {
            const storedToken = localStorage.getItem('authToken');
            const storedUser = localStorage.getItem('authUser');
            if (storedToken && storedUser) {
                setToken(storedToken);
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to parse auth data from localStorage", error);
            localStorage.clear();
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string, role: string) => {
        try {
            const { token: authToken, user: loggedInUser } = await loginUser(email, password, role);
            setToken(authToken);
            setUser(loggedInUser);
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('authUser', JSON.stringify(loggedInUser));
            return { success: true };
        } catch (error: any) {
            console.error('Login failed:', error);
            return { success: false, message: error.message };
        }
    };

    const logout = useCallback(() => {
        setUser(null);
        setToken(null);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
    }, []);

    const signup = async (userData: Omit<User, 'id'>) => {
        try {
            await signupUser(userData);
            return { success: true };
        } catch(error: any) {
            console.error('Signup failed:', error);
            return { success: false, message: error.message };
        }
    };
    
    const updateUser = (updatedUserData: Partial<User>) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const newUser = { ...prevUser, ...updatedUserData };
            localStorage.setItem('authUser', JSON.stringify(newUser));
            return newUser;
        });
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, logout, signup, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};