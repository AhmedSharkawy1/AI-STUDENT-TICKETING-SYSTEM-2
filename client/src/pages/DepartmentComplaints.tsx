import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import ComplaintCard from '../components/ComplaintCard';
import { ComplaintStatus, ComplaintPriority } from '../types';
import { useNotification } from '../context/NotificationContext';
import Spinner from '../components/Spinner';
import { fetchGeneratedSolution } from '../services/api';


const priorityOrderMap: Record<ComplaintPriority, number> = {
    [ComplaintPriority.Urgent]: 1,
    [ComplaintPriority.High]: 2,
    [ComplaintPriority.Medium]: 3,
    [ComplaintPriority.Low]: 4,
};

const statusOrderMap: Record<ComplaintStatus, number> = {
    [ComplaintStatus.Reopened]: 1,
    [ComplaintStatus.Open]: 2,
    [ComplaintStatus.Closed]: 3,
};


const DepartmentComplaints: React.FC = () => {
    const { user } = useAuth();
    const { getComplaintsByDepartment, updateComplaint, refreshData, isLoading, complaints: allComplaints } = useData();
    const { addNotification } = useNotification();
    
    const [filter, setFilter] = useState<ComplaintStatus | 'All'>('All');
    const [sortOrder, setSortOrder] = useState('date-desc');
    const [isBatchGenerating, setIsBatchGenerating] = useState(false);

    const departmentComplaints = useMemo(() => {
        if (user && user.departmentName) {
            return getComplaintsByDepartment(user.departmentName);
        }
        return [];
    }, [user, getComplaintsByDepartment, allComplaints]);

    const handleBatchGenerateSolutions = async () => {
        const ticketsToProcess = departmentComplaints.filter(c => 
            (c.status === ComplaintStatus.Open || c.status === ComplaintStatus.Reopened) && !c.solutionText
        );

        if (ticketsToProcess.length === 0) {
            addNotification('No open tickets require an AI solution at this time.', 'info');
            return;
        }

        setIsBatchGenerating(true);
        addNotification(`Starting AI solution generation for ${ticketsToProcess.length} tickets...`, 'info');

        let successCount = 0;
        let failure = false;
        try {
            await Promise.all(ticketsToProcess.map(async (complaint) => {
                const { solutionText } = await fetchGeneratedSolution(complaint);
                await updateComplaint(complaint.id, { solutionText });
                successCount++;
            }));
            addNotification(`Successfully generated ${successCount} solutions!`, 'success');
        } catch (error) {
            console.error('Batch AI generation failed:', error);
            failure = true;
        } finally {
            if (failure) {
                 addNotification('An error occurred during batch generation. Some solutions may not have been created.', 'error');
            }
            refreshData(); 
            setIsBatchGenerating(false);
        }
    };
    
    const processedComplaints = useMemo(() => {
        let filtered = departmentComplaints;

        if (filter !== 'All') {
            filtered = departmentComplaints.filter(c => c.status === filter);
        }

        const sorted = [...filtered];

        switch(sortOrder) {
            case 'date-asc':
                sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                break;
            case 'status':
                sorted.sort((a, b) => statusOrderMap[a.status] - statusOrderMap[b.status]);
                break;
            case 'priority':
                sorted.sort((a, b) => priorityOrderMap[a.priority] - priorityOrderMap[b.priority]);
                break;
            case 'date-desc':
            default:
                 sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                 break;
        }

        return sorted;
    }, [departmentComplaints, filter, sortOrder]);

    const openTicketsWithoutSolutions = useMemo(() => {
        return departmentComplaints.filter(c => (c.status === ComplaintStatus.Open || c.status === ComplaintStatus.Reopened) && !c.solutionText).length;
    }, [departmentComplaints]);

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">Complaints for {user?.departmentName}</h1>
                <div className="flex flex-wrap justify-end items-center gap-4">
                    <button
                        onClick={handleBatchGenerateSolutions}
                        disabled={isBatchGenerating || openTicketsWithoutSolutions === 0}
                        className="flex items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 dark:disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                    >
                        {isBatchGenerating ? <><Spinner size="sm"/><span className="ml-2">Generating...</span></> : <>✨ Generate Solutions for Open Tickets ({openTicketsWithoutSolutions})</>}
                    </button>
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1 text-right sm:text-left">Filter by</label>
                        <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                            {(['All', ComplaintStatus.Open, ComplaintStatus.Reopened, ComplaintStatus.Closed] as (ComplaintStatus | 'All')[]).map(status => (
                                <button key={status} onClick={() => setFilter(status)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors whitespace-nowrap ${filter === status ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/60'}`}>
                                    {status}
                                </button>
                            ))}
                        </div>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1 text-right sm:text-left">Sort by</label>
                        <div className="flex items-center space-x-1 bg-gray-200 dark:bg-gray-800 p-1 rounded-lg">
                            {[
                                { value: 'date-desc', label: 'Newest' },
                                { value: 'date-asc', label: 'Oldest' },
                                { value: 'priority', label: 'Priority' },
                                { value: 'status', label: 'Status' }
                            ].map(item => (
                                <button key={item.value} onClick={() => setSortOrder(item.value)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${sortOrder === item.value ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700/60'}`}>
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {isLoading ? (
                <div className="text-center py-12"><Spinner size="lg" /></div>
            ) : processedComplaints.length > 0 ? (
                <div className="space-y-4">
                    {processedComplaints.map(c => <ComplaintCard key={c.id} complaint={c} onUpdate={refreshData}/>)}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p className="text-gray-500 dark:text-gray-400">No complaints found for the selected filter.</p>
                </div>
            )}
        </div>
    );
};

export default DepartmentComplaints;