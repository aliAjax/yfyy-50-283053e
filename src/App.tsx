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
import BatchImport from '@/pages/BatchImport';
import KnowledgeBase from '@/pages/KnowledgeBase';
import DepartmentDirectory from '@/pages/DepartmentDirectory';
import DispatchRules from '@/pages/DispatchRules';
import WarningCenter from '@/pages/WarningCenter';
import DepartmentPerformance from '@/pages/DepartmentPerformance';
import ProcessSimulator from '@/pages/ProcessSimulator';
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
          <Route path="/submit" element={<PublicSubmit />} />
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
            path="/warning-center"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <WarningCenter />
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
            path="/batch-import"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <BatchImport />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/knowledge-base"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <KnowledgeBase />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/department-directory"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DepartmentDirectory />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/dispatch-rules"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DispatchRules />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/department-performance"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <DepartmentPerformance />
                </MainLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/process-simulator"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <ProcessSimulator />
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
