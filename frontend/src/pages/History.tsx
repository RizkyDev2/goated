
import React from 'react';
import { Layout } from '../components/Layout';
import { HistoryPage } from '../components/HistoryPage';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { ThemeProvider } from '../hooks/useTheme';

const HistoryContent: React.FC = () => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login to access history</div>;
  }

  return (
    <Layout>
      <HistoryPage />
    </Layout>
  );
};

const History = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HistoryContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default History;
