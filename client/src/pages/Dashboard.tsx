import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { Link } from 'react-router-dom';

const StudentDashboard: React.FC<{ name: string }> = ({ name }) => (
    <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome, {name}!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">How can we help you today?</p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/new-complaint" className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition duration-300 text-lg">
                Submit a New Complaint
            </Link>
            <Link to="/my-complaints" className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition duration-300 text-lg">
                View My Complaints
            </Link>
        </div>
    </div>
);

const DepartmentDashboard: React.FC<{ name: string; departmentName?: string }> = ({ name, departmentName }) => (
    <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Welcome, {name}</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">You are part of the <span className="font-semibold text-indigo-500">{departmentName}</span> team.</p>
        <Link to="/department-complaints" className="bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition duration-300 text-lg">
            View Assigned Complaints
        </Link>
    </div>
);


const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>; // Or redirect
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
      {user.role === Role.Student ? (
        <StudentDashboard name={user.name} />
      ) : (
        <DepartmentDashboard name={user.name} departmentName={user.departmentName} />
      )}
    </div>
  );
};

export default Dashboard;
