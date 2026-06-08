import { Badge, Layout, Menu, Avatar, Dropdown, theme } from 'antd';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  ListTodo,
  ClipboardCheck,
  BarChart3,
  Settings,
  LogOut,
  User,
  Bell,
  BookOpen,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <LayoutDashboard size={18} />,
    label: '数据驾驶舱',
  },
  {
    key: '/complaints',
    icon: <FileText size={18} />,
    label: '投诉管理',
  },
  {
    key: '/batch-import',
    icon: <FileSpreadsheet size={18} />,
    label: '批量录入',
  },
  {
    key: '/my-tasks',
    icon: <ListTodo size={18} />,
    label: '待办事项',
  },
  {
    key: '/supervision',
    icon: <ClipboardCheck size={18} />,
    label: '督办管理',
  },
  {
    key: '/statistics',
    icon: <BarChart3 size={18} />,
    label: '统计分析',
  },
  {
    key: '/knowledge-base',
    icon: <BookOpen size={18} />,
    label: '知识库管理',
  },
];

const titleMap: Record<string, string> = {
  '/dashboard': '数据驾驶舱',
  '/complaints': '投诉管理',
  '/batch-import': '批量录入预览',
  '/my-tasks': '待办事项',
  '/supervision': '督办管理',
  '/statistics': '统计分析',
  '/knowledge-base': '知识库管理',
  '/notifications': '通知中心',
};

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, setUser, getUnreadNotificationCount } = useAppStore();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      icon: <User size={16} />,
      label: '个人中心',
    },
    {
      key: 'settings',
      icon: <Settings size={16} />,
      label: '系统设置',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogOut size={16} />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const selectedKey = '/' + location.pathname.split('/')[1];
  const unreadNotificationCount = getUnreadNotificationCount();

  return (
    <Layout className="min-h-screen">
      <Sider
        width={220}
        style={{
          background: '#001529',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        <div className="flex items-center h-16 px-5 border-b border-blue-900/30">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
            城
          </div>
          <span className="ml-3 text-white font-semibold text-base">城市治理平台</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            borderRight: 'none',
            background: '#001529',
            color: 'rgba(255,255,255,0.65)',
            paddingTop: '12px',
          }}
        />
      </Sider>
      <Layout style={{ marginLeft: 220 }}>
        <Header
          style={{
            padding: '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 64,
            borderBottom: '1px solid #f0f0f0',
            position: 'sticky',
            top: 0,
            zIndex: 9,
          }}
        >
          <div className="text-lg font-medium text-gray-800">
            {titleMap[selectedKey] || '城市治理投诉建议平台'}
          </div>
          <div className="flex items-center gap-4">
            <div
              className="relative cursor-pointer p-2 rounded-lg hover:bg-gray-100 transition-colors"
              role="button"
              aria-label="通知中心"
              onClick={() => navigate('/notifications')}
            >
              <Badge count={unreadNotificationCount} size="small" overflowCount={99}>
                <Bell size={20} className="text-gray-600" />
              </Badge>
            </div>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                <Avatar size={36} style={{ backgroundColor: '#1890ff' }}>
                  {user?.name?.charAt(0) || '管'}
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    {user?.name || '管理员'}
                  </span>
                  <span className="text-xs text-gray-500">{user?.role || '系统管理员'}</span>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '20px',
            padding: 24,
            minHeight: 'calc(100vh - 104px)',
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
