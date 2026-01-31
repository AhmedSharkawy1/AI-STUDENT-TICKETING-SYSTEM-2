
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { DEPARTMENTS } from '../constants';
import { fetchDepartmentSuggestion } from '../services/api';
import type { DepartmentSuggestion } from '../types';
import { ComplaintPriority, Role } from '../types';
import { useNotification } from '../context/NotificationContext';
import Spinner from '../components/Spinner';

const NewComplaint: React.FC = () => {
    const [complaintText, setComplaintText] = useState('');
    const [studentId, setStudentId] = useState('');
    const [department, setDepartment] = useState(DEPARTMENTS[0]);
    const [priority, setPriority] = useState<ComplaintPriority>(ComplaintPriority.Medium);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuggestingDepartment, setIsSuggestingDepartment] = useState(false);
    const [suggestedDepartment, setSuggestedDepartment] = useState<DepartmentSuggestion | null>(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const { addComplaint, users } = useData();
    const { addNotification } = useNotification();

    useEffect(() => {
        if (user?.role !== Role.Student || complaintText.trim().length < 25) {
            setSuggestedDepartment(null);
            return;
        }

        const handler = setTimeout(async () => {
            let isActive = true;
            setIsSuggestingDepartment(true);
            setSuggestedDepartment(null);
            try {
                const prediction = await fetchDepartmentSuggestion(complaintText);
                if (isActive && prediction && prediction.department !== department) {
                    setSuggestedDepartment(prediction);
                }
            } catch (error) {
                console.error("Failed to fetch department suggestion:", error);
            } finally {
                if (isActive) {
                    setIsSuggestingDepartment(false);
                }
            }
            
            return () => {
                isActive = false;
            };
        }, 750); // 750ms debounce delay

        return () => {
            clearTimeout(handler);
        };
    }, [complaintText, department, user?.role]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!complaintText.trim() || !user) {
            addNotification('Please fill out the complaint details.', 'warning');
            return;
        }

        if (user.role === Role.Department && !studentId.trim()) {
            addNotification('Please enter the Student ID.', 'warning');
            return;
        }

        setIsLoading(true);

        try {
            let studentForComplaint = user;
            if (user.role === Role.Department) {
                const foundStudent = users.find(u => u.id.toLowerCase() === studentId.trim().toLowerCase() && u.role === Role.Student);
                if (!foundStudent) {
                    addNotification(`Student with ID "${studentId}" not found. Please check the ID and try again.`, 'error');
                    setIsLoading(false);
                    return;
                }
                studentForComplaint = foundStudent;
            }

            const complaintData = {
                studentId: studentForComplaint.id,
                studentName: studentForComplaint.name,
                department,
                complaintText,
                priority,
            };

            await addComplaint(complaintData);
            
            addNotification('Complaint submitted successfully!', 'success');
            
            if (user.role === Role.Department) {
                 navigate('/department-complaints');
            } else {
                 navigate('/my-complaints');
            }

        } catch (error) {
            console.error("Failed to submit complaint:", error);
            addNotification('There was an error submitting your complaint. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Submit a New Complaint</h1>
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="complaintText" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Describe your issue
                        </label>
                        <textarea
                            id="complaintText"
                            rows={6}
                            value={complaintText}
                            onChange={(e) => setComplaintText(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="Please provide as much detail as possible..."
                            required
                        />
                    </div>
                    {user?.role === Role.Department && (
                        <div>
                            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Student ID
                            </label>
                            <input
                                id="studentId"
                                type="text"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Enter the ID of the student filing the complaint"
                                required={user?.role === Role.Department}
                            />
                        </div>
                    )}
                    <div>
                        <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Select the relevant department
                        </label>
                        <select
                            id="department"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                        </select>
                         {user?.role === Role.Student && (
                           <div className="mt-2 text-sm p-3 bg-indigo-50 dark:bg-gray-700/50 border border-indigo-200 dark:border-gray-600 rounded-lg min-h-[52px] flex justify-between items-center transition-all duration-300 ease-in-out">
                                {isSuggestingDepartment ? (
                                    <div className="flex items-center text-indigo-500 w-full justify-center">
                                        <Spinner size="sm" />
                                        <span className="ml-3 font-medium">AI is analyzing your text...</span>
                                    </div>
                                ) : suggestedDepartment ? (
                                    <>
                                        <div className="flex-grow">
                                            <span>AI suggests <strong>{suggestedDepartment.department}</strong></span>
                                            <span className="text-xs text-gray-500 dark:text-gray-400 block italic">{suggestedDepartment.reason}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline px-3 py-1 rounded-md flex-shrink-0"
                                            onClick={() => {
                                                setDepartment(suggestedDepartment.department);
                                                setSuggestedDepartment(null); // Hide suggestion after applying
                                                addNotification(`Department switched to ${suggestedDepartment.department}.`, 'info');
                                            }}
                                        >
                                            Switch
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex items-center text-gray-500 dark:text-gray-400 w-full justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                                        <span className="font-medium">AI will suggest a department as you type.</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Set a priority
                        </label>
                        <select
                            id="priority"
                            value={priority}
                            onChange={(e) => setPriority(e.target.value as ComplaintPriority)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            {Object.values(ComplaintPriority).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>
                    <div>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            {isLoading ? <><Spinner size="sm" /> <span className="ml-2">Submitting...</span></> : 'Submit Complaint'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NewComplaint;
