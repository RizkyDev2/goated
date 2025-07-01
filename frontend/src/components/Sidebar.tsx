
import React from 'react';
import { Brain, Users, History } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  
  const menuItems = [
    { icon: Brain, label: 'Predict', href: '/', active: location.pathname === '/' },
    { icon: Users, label: 'Admin Panel', href: '/admin', adminOnly: true, active: location.pathname === '/admin' },
    { icon: History, label: 'Riwayat', href: '/history', active: location.pathname === '/history' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Klasifikasi App</h1>
      </div>
      
      <nav className="mt-6">
        {menuItems.map((item) => {
          if (item.adminOnly && user?.role !== 'ADMIN') return null;
          
          return (
            <Link
              key={item.label}
              to={item.href}
              className={`flex items-center px-6 py-3 text-sm font-medium transition-colors ${
                item.active
                  ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-r-2 border-blue-700 dark:border-blue-500'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-100'
              }`}
            >
              <item.icon className="w-5 h-5 mr-3" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};
