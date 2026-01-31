import React from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';
import { useTheme } from '../context/ThemeContext';

const ThemeToggleButton: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
            )}
        </button>
    );
}

const NavItem: React.FC<{ to: string; children: React.ReactNode }> = ({ to, children }) => {
    const baseClasses = "px-3 py-2 rounded-md text-sm font-medium transition-colors";
    const inactiveClasses = "text-gray-500 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700";
    const activeClasses = "bg-indigo-50 dark:bg-gray-900 text-indigo-600 dark:text-indigo-400";
    return (
        <NavLink to={to} className={({ isActive }) => `${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}>
            {children}
        </NavLink>
    );
}


const Header: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
                <Link to="/dashboard" className="flex items-center space-x-2">
                     <svg className="h-8 w-8 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-6.75 3h9m-9 3h9M3.375 21h17.25c1.657 0 3-1.343 3-3V6c0-1.657-1.343-3-3-3H3.375c-1.657 0-3 1.343-3 3v12c0 1.657 1.343 3 3 3z" />
                    </svg>
                    <span className="text-xl font-bold text-gray-800 dark:text-gray-100 hidden sm:block">AI Student Ticketing System</span>
                </Link>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              {user ? (
                <>
                  <nav className="hidden sm:flex items-center space-x-2 bg-gray-100 dark:bg-gray-900 p-1 rounded-lg">
                    {user.role === Role.Department && (
                        <>
                            <NavItem to="/department-complaints">Complaints</NavItem>
                            <NavItem to="/analytics">Analytics</NavItem>
                            <NavItem to="/department-profile">Profile</NavItem>
                        </>
                    )}
                    {user.role === Role.Student && (
                        <>
                            <NavItem to="/my-complaints">My Complaints</NavItem>
                            <NavItem to="/profile">Profile</NavItem>
                        </>
                    )}
                  </nav>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">Welcome, {user.name.split(' ')[0]}</span>
                    <ThemeToggleButton />
                    <button
                      onClick={handleLogout}
                      className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-md transition-colors"
                      title="Logout"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
                        </svg>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <ThemeToggleButton />
                  <Link to="/login" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
                    Sign in
                  </Link>
                  <Link to="/signup" className="text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-md">
                    Sign up
                  </Link>
                </>
              )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default Header;