import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User, Complaint } from '../types';
import { fetchUsers, fetchComplaints, createComplaint, updateComplaintById } from '../services/api';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';

interface DataContextType {
    users: User[];
    complaints: Complaint[];
    isLoading: boolean;
    addComplaint: (complaint: Partial<Complaint>) => Promise<boolean>;
    updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<boolean>;
    getComplaintsByStudent: (studentId: string) => Complaint[];
    getComplaintsByDepartment: (departmentName: string) => Complaint[];
    refreshData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addNotification } = useNotification();
    const { token, logout } = useAuth();

    const handleApiError = useCallback((error: any) => {
        if (error.message === 'Unauthorized' || error.message === 'Invalid token') {
            addNotification('Your session has expired. Please log in again.', 'error');
            logout();
        } else {
            addNotification(error.message || 'Could not connect to the server.', 'error');
        }
    }, [addNotification, logout]);
    
    const refreshData = useCallback(async () => {
        if (!token) {
            setUsers([]);
            setComplaints([]);
            setIsLoading(false);
            return;
        };
        setIsLoading(true);
        try {
            const [usersData, complaintsData] = await Promise.all([
                fetchUsers(),
                fetchComplaints()
            ]);
            setUsers(usersData);
            setComplaints(complaintsData);
        } catch (error) {
            console.error("Failed to load data from backend:", error);
            handleApiError(error);
        } finally {
            setIsLoading(false);
        }
    }, [token, handleApiError]);
    
    useEffect(() => {
        if(token) {
            refreshData();
        } else {
            // Clear data on logout
            setUsers([]);
            setComplaints([]);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);


    const addComplaint = async (complaintData: Partial<Complaint>): Promise<boolean> => {
        try {
            const newComplaint = await createComplaint(complaintData);
            setComplaints(prev => [newComplaint, ...prev]);
            return true;
        } catch (error) {
            console.error("Failed to create complaint:", error);
            handleApiError(error);
            return false;
        }
    };

    const updateComplaint = async (id: string, updates: Partial<Complaint>): Promise<boolean> => {
       try {
            const updatedComplaint = await updateComplaintById(id, updates);
            setComplaints(prev => prev.map(c => c.id === id ? updatedComplaint : c));
            return true;
       } catch (error) {
            console.error("Failed to update complaint:", error);
            handleApiError(error);
            return false;
       }
    };

    const getComplaintsByStudent = useCallback((studentId: string) => {
        return complaints.filter(c => c.studentId === studentId);
    }, [complaints]);

    const getComplaintsByDepartment = useCallback((departmentName: string) => {
        return complaints.filter(c => c.department === departmentName);
    }, [complaints]);

    const value = {
        users,
        complaints,
        isLoading,
        addComplaint,
        updateComplaint,
        getComplaintsByStudent,
        getComplaintsByDepartment,
        refreshData
    };

    return (
        <DataContext.Provider value={value}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};