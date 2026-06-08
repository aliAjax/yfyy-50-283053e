import { useState, useMemo } from 'react';
import {
  Card,
  Tabs,
  List,
  Tag,
  Button,
  Space,
  Empty,
  Badge,
} from 'antd';
import {
  Bell,
  AlertTriangle,
  Clock,
  RotateCcw,
  CheckCircle,
  FileText,
  ArrowLeft,
  CheckSquare,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { NotificationType } from '@/types';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'urge':
      return <AlertTriangle size={20} className="text-orange-500" />;
    case 'delay_request':
      return <Clock size={20} className="text-purple-500" />;
    case 'delay_approve':
      return <Clock size={20} className="text-green-500" />;
    case 'delay_reject':
      return <Clock size={20} className="text-red-500" />;
    case 'return':
      return <RotateCcw size={20} className="text-red-500" />;
    case 'review_pass':
      return <CheckCircle size={20} className="text-green-500" />;
    case 'new_complaint':
      return <FileText size={20} className="text-blue-500" />;
    default:
      return <Bell size={20} className="text-gray-500" />;
  }
};

const getNotificationTag = (type: NotificationType) => {
  switch (type) {
    case 'urge':
      return <Tag color="orange">催办</Tag>;
    case 'delay_request':
      return <Tag color="purple">延期申请</Tag>;
    case 'delay_approve':
      return <Tag color="green">延期通过</Tag>;
    case 'delay_reject':
      return <Tag color="red">延期驳回</Tag>;
    case 'return':
      return <Tag color="red">退回重办</Tag>;
    case 'review_pass':
      return <Tag color="green">审核通过</Tag>;
    case 'new_complaint':
      return <Tag color="blue">新投诉</Tag>;
    default:
      return <Tag>通知</Tag>;
  }
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [activeTab, setActiveTab] = useState('unread');

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'unread') {
      return notifications.filter((n) => !n.isRead);
    } else if (activeTab === 'read') {
      return notifications.filter((n) => n.isRead);
    }
    return notifications;
  }, [notifications, activeTab]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const handleNotificationClick = (notification: typeof notifications[0]) => {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }

    if (notification.type === 'delay_request') {
      navigate('/supervision?tab=delay');
    } else if (notification.complaintId) {
      navigate(`/complaints/${notification.complaintId}`);
    }
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const tabItems = [
    {
      key: 'unread',
      label: (
        <span className="flex items-center gap-2">
          未读
          {unreadCount > 0 && (
            <Badge count={unreadCount} size="small" />
          )}
        </span>
      ),
    },
    {
      key: 'read',
      label: (
        <span className="flex items-center gap-2">
          已读
          {readCount > 0 && (
            <Tag color="default">{readCount}</Tag>
          )}
        </span>
      ),
    },
    {
      key: 'all',
      label: <span className="flex items-center gap-2">全部</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="text"
            icon={<ArrowLeft size={18} />}
            onClick={handleBack}
            className="text-gray-600"
          >
            返回
          </Button>
          <h2 className="text-lg font-semibold text-gray-800">通知中心</h2>
        </div>
        {unreadCount > 0 && (
          <Button
            icon={<CheckSquare size={16} />}
            onClick={handleMarkAllRead}
          >
            全部标为已读
          </Button>
        )}
      </div>

      <Card className="shadow-sm" styles={{ body: { padding: '12px 24px 0' } }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Card>

      <Card className="shadow-sm">
        {filteredNotifications.length === 0 ? (
          <Empty
            description={
              activeTab === 'unread'
                ? '暂无未读通知'
                : activeTab === 'read'
                ? '暂无已读通知'
                : '暂无通知'
            }
            className="py-12"
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(item) => (
              <List.Item
                className={`cursor-pointer hover:bg-gray-50 transition-colors px-4 rounded-lg ${!item.isRead ? 'bg-blue-50/30' : ''}`}
                onClick={() => handleNotificationClick(item)}
              >
                <List.Item.Meta
                  avatar={
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {getNotificationIcon(item.type)}
                    </div>
                  }
                  title={
                    <div className="flex items-center gap-2">
                      {!item.isRead && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                      )}
                      <span className="font-medium text-gray-800">{item.title}</span>
                      {getNotificationTag(item.type)}
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      <p className="text-gray-600 text-sm line-clamp-2">{item.content}</p>
                      <p className="text-gray-400 text-xs">
                        {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                      </p>
                    </div>
                  }
                />
              </List.Item>
            )}
            split
            className="notification-list"
          />
        )}
      </Card>
    </div>
  );
};

export default NotificationCenter;
