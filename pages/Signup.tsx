import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Role } from '../types';
import { DEPARTMENTS } from '../constants';
import Spinner from '../components/Spinner';

const Signup: React.FC = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>(Role.Student);
    const [major, setMajor] = useState('');
    const [departmentName, setDepartmentName] = useState(DEPARTMENTS[0]);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { signup } = useAuth();
    const { addNotification } = useNotification();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let userData: any = { name, email, password, role };
        if (role === Role.Student) {
            if (!major) {
                addNotification('Please enter your major.', 'warning');
                return;
            }
            userData.major = major;
        } else {
            userData.departmentName = departmentName;
        }

        setIsLoading(true);
        const success = await signup(userData);
        setIsLoading(false);

        if (success) {
            addNotification('Account created successfully! Please log in.', 'success');
            navigate('/login');
        } else {
            addNotification('An account with this email already exists.', 'error');
        }
    };

  return (
    <div className="flex items-center justify-center py-12">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
        <h2 className="text-3xl font-extrabold text-center text-gray-900 dark:text-white">
          Create a new account
        </h2>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name">Full Name</label>
            <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
          </div>
          <div>
            <label htmlFor="email">Email address</label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
          </div>
          <div>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
          </div>
          <div>
            <label htmlFor="role">I am a</label>
            <select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
              <option value={Role.Student}>Student</option>
              <option value={Role.Department}>Department Staff</option>
            </select>
          </div>
          {role === Role.Student && (
            <div>
              <label htmlFor="major">Major</label>
              <input id="major" type="text" required={role === Role.Student} value={major} onChange={(e) => setMajor(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm" />
            </div>
          )}
          {role === Role.Department && (
            <div>
              <label htmlFor="department">Department</label>
              <select id="department" value={departmentName} onChange={(e) => setDepartmentName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm">
                {DEPARTMENTS.map(dep => <option key={dep} value={dep}>{dep}</option>)}
              </select>
            </div>
          )}
          <div>
            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400">
              {isLoading ? <Spinner size="sm" /> : 'Sign up'}
            </button>
          </div>
        </form>
         <p className="text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
                Sign in
            </Link>
        </p>
      </div>
    </div>
  );
};

export default Signup;