import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="text-center py-20">
      <h1 className="text-6xl font-bold text-indigo-600">404</h1>
      <h2 className="text-3xl font-semibold mt-4">Page Not Found</h2>
      <p className="text-gray-600 dark:text-gray-400 mt-2">Sorry, the page you are looking for does not exist.</p>
      <Link 
        to="/dashboard" 
        className="mt-6 inline-block bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-indigo-700 transition duration-300"
      >
        Go to Dashboard
      </Link>
    </div>
  );
};

export default NotFound;
