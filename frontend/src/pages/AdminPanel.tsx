
import React from 'react';
import { Layout } from '../components/Layout';
import { AdminPage } from '../components/AdminPage';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';

const AdminPanelContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login to access admin panel</div>;
  }

  if (user?.role !== 'ADMIN') {
    return <div>Access denied. Admin privileges required.</div>;
  }

  return (
    <Layout>
      <AdminPage />
    </Layout>
  );
};

const AdminPanel = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AdminPanelContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default AdminPanel;
