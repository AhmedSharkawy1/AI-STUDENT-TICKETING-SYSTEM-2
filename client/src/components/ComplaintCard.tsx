import React, { useState } from 'react';
import type { Complaint } from '../types';
import { ComplaintStatus, Role, ComplaintPriority } from '../types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useNotification } from '../context/NotificationContext';
import Spinner from './Spinner';
import { fetchGeneratedSolution, fetchStudentRecommendation } from '../services/api';
import { DEPARTMENTS } from '../constants';


interface ComplaintCardProps {
    complaint: Complaint;
    onUpdate: () => void;
}

const getStatusColor = (status: ComplaintStatus) => {
    switch (status) {
        case ComplaintStatus.Open: return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
        case ComplaintStatus.Closed: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case ComplaintStatus.Reopened: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const getPriorityColor = (priority: ComplaintPriority) => {
    switch (priority) {
        case ComplaintPriority.Urgent: return 'bg-red-500 text-white';
        case ComplaintPriority.High: return 'bg-yellow-500 text-white';
        case ComplaintPriority.Medium: return 'bg-blue-500 text-white';
        case ComplaintPriority.Low: return 'bg-gray-500 text-white';
        default: return 'bg-gray-500 text-white';
    }
}

const ComplaintCard: React.FC<ComplaintCardProps> = ({ complaint, onUpdate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [solutionText, setSolutionText] = useState(complaint.solutionText || '');
    const [newStatus, setNewStatus] = useState<ComplaintStatus>(complaint.status);
    const [newDepartment, setNewDepartment] = useState<string>(complaint.department);
    const [isSaving, setIsSaving] = useState(false);
    const [isGeneratingSolution, setIsGeneratingSolution] = useState(false);
    const [studentRecommendation, setStudentRecommendation] = useState<string | null>(null);
    const [isGeneratingStudentRecommendation, setIsGeneratingStudentRecommendation] = useState(false);


    const { user } = useAuth();
    const { updateComplaint } = useData();
    const { addNotification } = useNotification();

    const isDepartmentUser = user?.role === Role.Department;
    const isStudentUser = user?.role === Role.Student;

    const handleGenerateSolution = async () => {
        setIsGeneratingSolution(true);
        try {
            const { solutionText: generatedText } = await fetchGeneratedSolution(complaint);
            setSolutionText(generatedText);
            addNotification('AI solution generated!', 'success');
        } catch (error) {
            addNotification('Failed to generate AI solution.', 'error');
            console.error(error);
        } finally {
            setIsGeneratingSolution(false);
        }
    };
    
    const handleGenerateStudentRecommendation = async () => {
        if (!complaint.solutionText) return;
        setIsGeneratingStudentRecommendation(true);
        setStudentRecommendation(null);
        try {
            const { recommendationText } = await fetchStudentRecommendation(complaint);
            setStudentRecommendation(recommendationText);
        } catch (error) {
            addNotification('Failed to get AI advice.', 'error');
            console.error(error);
        } finally {
            setIsGeneratingStudentRecommendation(false);
        }
    }

    const handleSave = async () => {
        if (isDepartmentUser && !solutionText.trim() && newStatus === ComplaintStatus.Closed) {
            addNotification('Please provide a solution before closing the complaint.', 'warning');
            return;
        }

        setIsSaving(true);
        const success = await updateComplaint(complaint.id, { 
            status: newStatus, 
            solutionText: solutionText.trim(),
            department: newDepartment,
            resolvedAt: newStatus === ComplaintStatus.Closed ? new Date().toISOString() : null,
        });

        if (success) {
            addNotification('Complaint updated successfully!', 'success');
            onUpdate(); // Refresh the list
            if (newStatus === ComplaintStatus.Closed || newDepartment !== complaint.department) {
                setIsOpen(false);
            }
        }
        // Error is handled by DataContext
        setIsSaving(false);
    };
    
    const handleReopen = async () => {
        setIsSaving(true);
        const success = await updateComplaint(complaint.id, { status: ComplaintStatus.Reopened, solutionText: '', resolvedAt: null });
        if (success) {
            addNotification('Complaint reopened successfully!', 'success');
            onUpdate();
        }
        setIsSaving(false);
    }

    const handleStudentClose = async () => {
        setIsSaving(true);
        const success = await updateComplaint(complaint.id, { status: ComplaintStatus.Closed, resolvedAt: new Date().toISOString() });
        if (success) {
            addNotification('Complaint closed successfully!', 'success');
            onUpdate();
            setIsOpen(false);
        }
        setIsSaving(false);
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden transition-shadow duration-300 hover:shadow-lg">
            <div className="p-4 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                    <div className="flex-grow mb-2 sm:mb-0 min-w-0">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {complaint.id} | {complaint.department}
                        </p>
                        <p className="font-semibold text-lg truncate pr-4">
                            {complaint.complaintText}
                        </p>
                    </div>
                    <div className="flex items-center space-x-4 flex-shrink-0">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(complaint.priority)}`}>
                            {complaint.priority}
                        </span>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(complaint.status)}`}>
                            {complaint.status}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(complaint.createdAt).toLocaleDateString()}
                        </span>
                        <svg className={`h-5 w-5 text-gray-500 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                    </div>
                </div>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-semibold text-gray-700 dark:text-gray-300">Complaint Details</h4>
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{complaint.complaintText}</p>
                            <p className="text-sm text-gray-500 mt-2">Submitted by: {complaint.studentName} ({complaint.studentId})</p>
                        </div>

                        {isDepartmentUser && complaint.aiRecommendation && (
                            <div className="bg-indigo-50 dark:bg-indigo-900/50 p-3 rounded-lg">
                                <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 flex items-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                    AI Recommendation for Staff
                                </h4>
                                <p className="text-indigo-700 dark:text-indigo-300 mt-1">{complaint.aiRecommendation}</p>
                            </div>
                        )}
                        
                        {complaint.solutionText && (
                             <div>
                                <h4 className="font-semibold text-gray-700 dark:text-gray-300">Solution Provided</h4>
                                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{complaint.solutionText}</p>
                            </div>
                        )}

                        {isDepartmentUser && complaint.status !== ComplaintStatus.Closed && (
                            <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label htmlFor={`solution-${complaint.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Provide Solution / Update
                                        </label>
                                        <button 
                                            onClick={handleGenerateSolution}
                                            disabled={isGeneratingSolution}
                                            className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-semibold disabled:opacity-50"
                                        >
                                            {isGeneratingSolution ? (
                                                <><Spinner size="sm" /> <span className="ml-2">Generating...</span></>
                                            ) : (
                                                <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                                Generate AI Solution
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    <textarea
                                        id={`solution-${complaint.id}`}
                                        rows={4}
                                        value={solutionText}
                                        onChange={(e) => setSolutionText(e.target.value)}
                                        className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Describe the resolution steps taken..."
                                    />
                                </div>
                                <div className="flex flex-col sm:flex-row items-center gap-4">
                                     <div className="w-full sm:w-auto">
                                        <label htmlFor={`status-${complaint.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Update Status
                                        </label>
                                        <select
                                            id={`status-${complaint.id}`}
                                            value={newStatus}
                                            onChange={(e) => setNewStatus(e.target.value as ComplaintStatus)}
                                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            <option value={ComplaintStatus.Open}>Open</option>
                                            <option value={ComplaintStatus.Reopened}>Reopened</option>
                                            <option value={ComplaintStatus.Closed}>Closed</option>
                                        </select>
                                    </div>
                                    <div className="w-full sm:w-auto">
                                        <label htmlFor={`department-${complaint.id}`} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Change Department
                                        </label>
                                        <select
                                            id={`department-${complaint.id}`}
                                            value={newDepartment}
                                            onChange={(e) => setNewDepartment(e.target.value)}
                                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                        >
                                            {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                                        </select>
                                    </div>
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full sm:w-auto mt-4 sm:mt-6 self-end flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                                    >
                                        {isSaving ? <Spinner size="sm" /> : 'Save Update'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {isStudentUser && (complaint.status === ComplaintStatus.Open || complaint.status === ComplaintStatus.Reopened) && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                                <button
                                    onClick={handleStudentClose}
                                    disabled={isSaving}
                                    className="flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                >
                                    {isSaving ? <Spinner size="sm" /> : 'Close My Ticket'}
                                </button>
                            </div>
                        )}

                        {isStudentUser && complaint.status === ComplaintStatus.Closed && (
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center mb-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                                        Is the issue resolved?
                                    </h4>
                                    
                                    {isGeneratingStudentRecommendation ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Spinner size="sm" />
                                            <span className="ml-2 text-gray-600 dark:text-gray-300">Getting AI advice...</span>
                                        </div>
                                    ) : studentRecommendation ? (
                                        <p className="text-gray-700 dark:text-gray-300 mt-1">{studentRecommendation}</p>
                                    ): (
                                        <button
                                            onClick={handleGenerateStudentRecommendation}
                                            className="w-full text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 font-semibold"
                                        >
                                            ✨ Get AI Advice on this Solution
                                        </button>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <button
                                        onClick={handleReopen}
                                        disabled={isSaving}
                                        className="flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                                    >
                                        {isSaving ? <Spinner size="sm" /> : 'Reopen Complaint'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintCard;