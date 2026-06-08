import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from '@/pages/Login';
import PublicSubmit from '@/pages/PublicSubmit';
import Dashboard from '@/pages/Dashboard';
import ComplaintList from '@/pages/ComplaintList';
import ComplaintDetail from '@/pages/ComplaintDetail';
import MyTasks from '@/pages/MyTasks';
import Supervision from '@/pages/Supervision';
import Statistics from '@/pages/Statistics';
import NotificationCenter from '@/pages/NotificationCenter';
import MainLayout from '@/components/MainLayout';
import { useAppStore } from '@/store/appStore';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAppStore();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
        components: {
          Button: {
            controlHeight: 36,
          },
          Input: {
            controlHeight: 36,
          },
          Select: {
            controlHeight: 36,
          },
        },
      }}
    >
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/public-submit" element={<PublicSubmit />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Dashboard />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ComplaintList />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/complaints/:id"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ComplaintDetail />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-tasks"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <MyTasks />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervision"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Supervision />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <NotificationCenter />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/statistics"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Statistics />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ConfigProvider>
  );
}
