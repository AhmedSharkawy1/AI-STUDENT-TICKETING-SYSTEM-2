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
    password?: string;
    role: Role;
    major?: string; 
    departmentName?: string;
    age?: number;
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
    resolvedAt?: string | null;
    solutionText?: string;
    aiRecommendation?: string;
}

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