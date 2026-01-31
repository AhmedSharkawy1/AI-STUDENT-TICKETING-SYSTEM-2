import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { ComplaintStatus, ComplaintPriority } from '../types';
import ComplaintCard from '../components/ComplaintCard';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';

const priorityOrderMap: Record<ComplaintPriority, number> = {
    [ComplaintPriority.Urgent]: 1,
    [ComplaintPriority.High]: 2,
    [ComplaintPriority.Medium]: 3,
    [ComplaintPriority.Low]: 4,
};

const statusOrderMap: Record<ComplaintStatus, number> = {
    [ComplaintStatus.Reopened]: 1,
    // FIX: Used ComplaintStatus enum instead of ComplaintPriority for Open status.
    [ComplaintStatus.Open]: 2,
    // FIX: Used ComplaintStatus enum instead of ComplaintPriority for Closed status.
    [ComplaintStatus.Closed]: 3,
};

const MyComplaints: React.FC = () => {
    const { user } = useAuth();
    const { getComplaintsByStudent, isLoading, complaints: allComplaints, refreshData } = useData();
    const [sortOrder, setSortOrder] = useState('date-desc');

    const myComplaints = useMemo(() => {
        if (user) {
            return getComplaintsByStudent(user.id);
        }
        return [];
    }, [user, getComplaintsByStudent, allComplaints]);


    const sortedComplaints = useMemo(() => {
        const sorted = [...myComplaints];
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
    }, [myComplaints, sortOrder]);


    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold">My Complaints</h1>
                <div className="flex flex-wrap items-center justify-end gap-4">
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
                    <Link to="/new-complaint" className="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700 transition duration-300 whitespace-nowrap self-end">
                        + New Complaint
                    </Link>
                </div>
            </div>
            
            {isLoading ? (
                <div className="text-center py-12"><Spinner size="lg" /></div>
            ) : sortedComplaints.length > 0 ? (
                <div className="space-y-4">
                    {sortedComplaints.map(c => <ComplaintCard key={c.id} complaint={c} onUpdate={refreshData}/>)}
                </div>
            ) : (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                    <p className="text-gray-500 dark:text-gray-400">You haven't submitted any complaints yet.</p>
                </div>
            )}
        </div>
    );
};

export default MyComplaints;