
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { loginUser, signupUser } from '../services/api';
import { useNotification } from './NotificationContext';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string, role: string) => Promise<boolean>;
  logout: () => void;
  signup: (userData: Omit<User, 'id'>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { addNotification } = useNotification();


    useEffect(() => {
        try {
            const storedUser = localStorage.getItem('authUser');
            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }
        } catch (error) {
            console.error("Failed to parse auth user from localStorage", error);
            localStorage.removeItem('authUser');
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string, role: string): Promise<boolean> => {
        try {
            const loggedInUser = await loginUser(email, password, role);
            setUser(loggedInUser);
            localStorage.setItem('authUser', JSON.stringify(loggedInUser));
            return true;
        } catch (error) {
            console.error('Login failed:', error);
            return false;
        }
    };

    const logout = useCallback(() => {
        setUser(null);
        localStorage.removeItem('authUser');
    }, []);

    const signup = async (userData: Omit<User, 'id'>): Promise<boolean> => {
        try {
            await signupUser(userData);
            return true;
        } catch(error) {
            console.error('Signup failed:', error);
            return false;
        }
    };
    

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout, signup }}>
            {!isLoading && children}
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
