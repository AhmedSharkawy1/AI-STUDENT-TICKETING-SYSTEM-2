import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { NotificationProvider } from './context/NotificationContext';
import { ThemeProvider } from './context/ThemeContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import MyComplaints from './pages/MyComplaints';
import NewComplaint from './pages/NewComplaint';
import DepartmentComplaints from './pages/DepartmentComplaints';
import NotFound from './pages/NotFound';
import Analytics from './pages/Analytics';
import Profile from './pages/Profile';
import DepartmentProfile from './pages/DepartmentProfile';
import Header from './components/Header';
import NotificationContainer from './components/NotificationContainer';
import { Role } from './types';
import Spinner from './components/Spinner';

const PrivateRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { token, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Spinner size="lg" />
      </div>
    );
  }
  return token ? children : <Navigate to="/login" replace />;
};

const StudentRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/dashboard" replace />;
    return user.role === Role.Student ? children : <Navigate to="/dashboard" replace />;
};

const DepartmentRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/dashboard" replace />;
    return user.role === Role.Department ? children : <Navigate to="/dashboard" replace />;
};


const AppContent: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
            <Header />
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <NotificationContainer />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />

                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    
                    <Route path="/profile" element={<PrivateRoute><StudentRoute><Profile /></StudentRoute></PrivateRoute>} />
                    <Route path="/department-profile" element={<PrivateRoute><DepartmentRoute><DepartmentProfile /></DepartmentRoute></PrivateRoute>} />
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
    <ThemeProvider>
      <HashRouter>
          <NotificationProvider>
            <AuthProvider>
              <DataProvider>
                <AppContent />
              </DataProvider>
            </AuthProvider>
          </NotificationProvider>
      </HashRouter>
    </ThemeProvider>
  );
};

export default App;