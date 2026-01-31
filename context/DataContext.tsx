
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import type { User, Complaint } from '../types';
import { fetchUsers, fetchComplaints, createComplaint, updateComplaintById } from '../services/api';
import { useNotification } from './NotificationContext';

interface DataContextType {
    users: User[];
    complaints: Complaint[];
    isLoading: boolean;
    addComplaint: (complaint: Partial<Complaint>) => Promise<void>;
    updateComplaint: (id: string, updates: Partial<Complaint>) => Promise<void>;
    getComplaintsByStudent: (studentId: string) => Complaint[];
    getComplaintsByDepartment: (departmentName: string) => Complaint[];
    refreshData: () => void;
}


const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<User[]>([]);
    const [complaints, setComplaints] = useState<Complaint[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { addNotification } = useNotification();

    const refreshData = useCallback(async () => {
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
            addNotification('Could not connect to the server. Please check your connection.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addNotification]);
    
    useEffect(() => {
        refreshData();
    }, [refreshData]);


    const addComplaint = async (complaintData: Partial<Complaint>) => {
        const newComplaint = await createComplaint(complaintData);
        setComplaints(prev => [newComplaint, ...prev]);
    };

    const updateComplaint = async (id: string, updates: Partial<Complaint>) => {
        const updatedComplaint = await updateComplaintById(id, updates);
        setComplaints(prev => prev.map(c => c.id === id ? updatedComplaint : c));
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
