import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MyComplaints from './pages/MyComplaints';
import NewComplaint from './pages/NewComplaint';
import DepartmentComplaints from './pages/DepartmentComplaints';
import NotFound from './pages/NotFound';
import Header from './components/Header';
import { NotificationProvider } from './context/NotificationContext';
import NotificationContainer from './components/NotificationContainer';
import Analytics from './pages/Analytics';

// A wrapper for routes that require authentication
const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" />;
};

// A wrapper for routes that should only be accessed by students
const StudentRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();
    return user && user.role === 'student' ? children : <Navigate to="/dashboard" />;
};

// A wrapper for routes that should only be accessed by department staff
const DepartmentRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();
    return user && user.role === 'department' ? children : <Navigate to="/dashboard" />;
};


const AppContent: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <Header />
            <main className="container mx-auto p-4 md:p-8">
              <NotificationContainer />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/" element={<Navigate to="/dashboard" />} />

                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/analytics" element={<PrivateRoute><DepartmentRoute><Analytics /></DepartmentRoute></PrivateRoute>} />
                    
                    <Route path="/my-complaints" element={<PrivateRoute><StudentRoute><MyComplaints /></StudentRoute></PrivateRoute>} />
                    <Route path="/new-complaint" element={<PrivateRoute><NewComplaint /></PrivateRoute>} />
                    
                    <Route path="/department-complaints" element={<PrivateRoute><DepartmentRoute><DepartmentComplaints /></DepartmentRoute></PrivateRoute>} />

                    <Route path="*" element={<NotFound />} />
                </Routes>
            </main>
        </div>
    );
};

const App: React.FC = () => {
  return (
    <HashRouter>
        <NotificationProvider>
            <DataProvider>
                <AuthProvider>
                    <AppContent />
                </AuthProvider>
            </DataProvider>
        </NotificationProvider>
    </HashRouter>
  );
};

export default App;