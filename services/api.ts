import type { User, Complaint, DepartmentSuggestion } from '../types';

const API_BASE_URL = '/api'; // Your backend server URL

const handleResponse = async (response: Response) => {
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'An API error occurred');
    }
    return response.json();
};

// Auth
export const loginUser = async (email: string, password: string, role: string): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
    });
    return handleResponse(response);
};

export const signupUser = async (userData: Omit<User, 'id'>): Promise<User> => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
    });
    return handleResponse(response);
};

// Data
export const fetchUsers = async (): Promise<User[]> => {
    const response = await fetch(`${API_BASE_URL}/users`);
    return handleResponse(response);
};

export const fetchComplaints = async (): Promise<Complaint[]> => {
    const response = await fetch(`${API_BASE_URL}/complaints`);
    return handleResponse(response);
};

export const createComplaint = async (complaintData: Partial<Complaint>): Promise<Complaint> => {
    const response = await fetch(`${API_BASE_URL}/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(complaintData),
    });
    return handleResponse(response);
};

export const updateComplaintById = async (id: string, updates: Partial<Complaint>): Promise<Complaint> => {
    const response = await fetch(`${API_BASE_URL}/complaints/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    return handleResponse(response);
};

// AI Services
export const fetchDepartmentSuggestion = async (complaintText: string): Promise<DepartmentSuggestion> => {
    const response = await fetch(`${API_BASE_URL}/ai/suggest-department`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintText }),
    });
    return handleResponse(response);
};

export const fetchGeneratedSolution = async (complaint: Complaint): Promise<{ solutionText: string }> => {
    const response = await fetch(`${API_BASE_URL}/complaints/${complaint.id}/generate-solution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintText: complaint.complaintText, department: complaint.department }),
    });
    return handleResponse(response);
};

export const fetchStudentRecommendation = async (complaint: Complaint): Promise<{ recommendationText: string }> => {
    const response = await fetch(`${API_BASE_URL}/complaints/${complaint.id}/generate-student-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaintText: complaint.complaintText, solutionText: complaint.solutionText }),
    });
    return handleResponse(response);
};