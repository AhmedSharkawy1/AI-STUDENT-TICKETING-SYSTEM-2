export enum Role {
    Student = 'student',
    Department = 'department'
}

export enum ComplaintStatus {
    Open = 'Open',
    Closed = 'Closed',
    Reopened = 'Reopened'
}

export enum ComplaintPriority {
    Urgent = 'Urgent',
    High = 'High',
    Medium = 'Medium',
    Low = 'Low'
}


export interface User {
    id: string;
    name: string;
    email: string;
    password?: string; // Should not be stored long-term
    role: Role;
    major?: string; // For students
    departmentName?: string; // For department staff
}

export interface Complaint {
    id: string;
    studentId: string;
    studentName: string;
    department: string;
    complaintText: string;
    status: ComplaintStatus;
    priority: ComplaintPriority;
    createdAt: string;
    solutionText?: string;
    aiRecommendation?: string;
}

// FIX: Added missing DepartmentSuggestion interface.
export interface DepartmentSuggestion {
    department: string;
    reason: string;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: number;
  message: string;
  type: NotificationType;
}