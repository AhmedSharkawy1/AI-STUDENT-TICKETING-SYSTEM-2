import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useData } from '../context/DataContext';
import { ComplaintStatus, ComplaintPriority, Complaint } from '../types';
import { DEPARTMENTS } from '../constants';

// Chart.js is available globally from index.html
declare var Chart: any;

const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center space-x-4">
        <div className="bg-indigo-100 dark:bg-indigo-500/20 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</h3>
            <p className="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{value}</p>
        </div>
    </div>
);

const ChartContainer: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h2>
        <div className="h-80 relative">
            {children}
        </div>
    </div>
);

type TimeRange = '30d' | '90d' | 'all';

const Analytics: React.FC = () => {
    const { complaints } = useData();
    const [timeRange, setTimeRange] = useState<TimeRange>('all');

    const filteredComplaints = useMemo(() => {
        if (timeRange === 'all') {
            return complaints;
        }
        const now = new Date();
        const days = timeRange === '30d' ? 30 : 90;
        const cutoffDate = new Date(new Date().setDate(now.getDate() - days));
        return complaints.filter(c => new Date(c.createdAt) >= cutoffDate);
    }, [complaints, timeRange]);

    const overallStats = useMemo(() => {
        const total = filteredComplaints.length;
        const open = filteredComplaints.filter(c => c.status === ComplaintStatus.Open).length;
        const reopened = filteredComplaints.filter(c => c.status === ComplaintStatus.Reopened).length;
        const closed = total - open - reopened;
        
        return { total, open, reopened, closed };
    }, [filteredComplaints]);

    const deptChartRef = useRef<HTMLCanvasElement>(null);
    const priorityChartRef = useRef<HTMLCanvasElement>(null);
    const timeChartRef = useRef<HTMLCanvasElement>(null);
    const statusChartRef = useRef<HTMLCanvasElement>(null);

    const chartInstances = useRef<any>({});

    useEffect(() => {
        const destroyCharts = () => {
            Object.values(chartInstances.current).forEach((chart: any) => {
                if (chart) chart.destroy();
            });
            chartInstances.current = {};
        };
        
        destroyCharts();

        // --- Chart Data Processing ---

        const deptData = {
            labels: DEPARTMENTS,
            datasets: [{
                data: DEPARTMENTS.map(dept => filteredComplaints.filter(c => c.department === dept).length),
                backgroundColor: ['#6366F1', '#8B5CF6', '#10B981', '#3B82F6'],
                hoverOffset: 4
            }]
        };

        const priorityData = {
            labels: Object.values(ComplaintPriority),
            datasets: [{
                label: 'Complaints',
                data: Object.values(ComplaintPriority).map(p => filteredComplaints.filter(c => c.priority === p).length),
                backgroundColor: ['#EF4444', '#F97316', '#F59E0B', '#6B7280'],
            }]
        };
        
        const statusData = {
            labels: ['Open', 'Reopened', 'Closed'],
            datasets: [{
                data: [overallStats.open, overallStats.reopened, overallStats.closed],
                backgroundColor: ['#3B82F6', '#F59E0B', '#10B981'],
                hoverOffset: 4
            }]
        }

        const complaintsByDate = filteredComplaints.reduce((acc, c) => {
            const date = new Date(c.createdAt).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const dateLabels = Object.keys(complaintsByDate).sort();
        const timeData = {
            labels: dateLabels,
            datasets: [{
                label: 'Complaints per Day',
                data: dateLabels.map(date => complaintsByDate[date]),
                fill: true,
                borderColor: '#6366F1',
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                tension: 0.1
            }]
        };
        

        // --- Chart Initialization ---

        if (deptChartRef.current) {
            chartInstances.current.deptChart = new Chart(deptChartRef.current, {
                type: 'doughnut',
                data: deptData,
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
            });
        }
        if (priorityChartRef.current) {
            chartInstances.current.priorityChart = new Chart(priorityChartRef.current, {
                type: 'bar',
                data: priorityData,
                options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
            });
        }
        if (timeChartRef.current) {
             chartInstances.current.timeChart = new Chart(timeChartRef.current, {
                type: 'line',
                data: timeData,
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { title: { display: true, text: 'Date' } }, y: { beginAtZero: true, title: { display: true, text: 'No. of Complaints' } } } }
            });
        }
        if (statusChartRef.current) {
            chartInstances.current.statusChart = new Chart(statusChartRef.current, {
                type: 'pie',
                data: statusData,
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } } }
            });
        }

        return () => destroyCharts();

    }, [filteredComplaints, overallStats]);


    return (
        <div className="space-y-6">
             <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                <h1 className="text-3xl font-bold">HelpDesk Analytics</h1>
                <div className="flex items-center space-x-2 bg-gray-200 dark:bg-gray-700 p-1 rounded-lg mt-4 sm:mt-0">
                    {(['30d', '90d', 'all'] as TimeRange[]).map(range => (
                        <button key={range} onClick={() => setTimeRange(range)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${timeRange === range ? 'bg-white dark:bg-gray-900 text-indigo-600 shadow' : 'text-gray-600 dark:text-gray-300'}`}>
                            {range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard title="Total Complaints" value={overallStats.total} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>} />
                <StatCard title="Active (Open/Reopened)" value={overallStats.open + overallStats.reopened} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                <StatCard title="Resolved" value={overallStats.closed} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
            </div>

            {/* Main Chart */}
            <ChartContainer title="Complaints Over Time">
                <canvas ref={timeChartRef}></canvas>
            </ChartContainer>

            {/* Secondary Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <ChartContainer title="Complaints by Department">
                        <canvas ref={deptChartRef}></canvas>
                    </ChartContainer>
                </div>
                <div className="lg:col-span-2">
                     <ChartContainer title="Complaints by Priority">
                        <canvas ref={priorityChartRef}></canvas>
                    </ChartContainer>
                </div>
            </div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className="lg:col-span-1">
                    <ChartContainer title="Status Distribution">
                        <canvas ref={statusChartRef}></canvas>
                    </ChartContainer>
                </div>
            </div>
        </div>
    );
};

export default Analytics;