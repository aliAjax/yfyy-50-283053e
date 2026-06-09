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
  Tooltip,
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
  ExternalLink,
  Eye,
  ThumbsUp,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { NotificationType, Notification } from '@/types';

type BusinessGroupKey = 'delay_approve' | 'return' | 'urge' | 'new_complaint' | 'others';

interface BusinessGroup {
  key: BusinessGroupKey;
  label: string;
  types: NotificationType[];
}

const businessGroups: BusinessGroup[] = [
  {
    key: 'delay_approve',
    label: '延期审批',
    types: ['delay_request', 'delay_approve', 'delay_reject'],
  },
  {
    key: 'return',
    label: '退回重办',
    types: ['return'],
  },
  {
    key: 'urge',
    label: '催办',
    types: ['urge'],
  },
  {
    key: 'new_complaint',
    label: '新投诉',
    types: ['new_complaint'],
  },
  {
    key: 'others',
    label: '其他通知',
    types: ['review_pass'],
  },
];

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

const getGroupNotifications = (notifications: Notification[], group: BusinessGroup, readStatus: string) => {
  let result = notifications.filter((n) => group.types.includes(n.type));
  if (readStatus === 'unread') {
    result = result.filter((n) => !n.isRead);
  } else if (readStatus === 'read') {
    result = result.filter((n) => n.isRead);
  }
  return result;
};

const getActionButton = (
  notification: Notification,
  navigate: ReturnType<typeof useNavigate>,
  markRead: (id: string) => void
) => {
  if (!notification.isRead) {
    markRead(notification.id);
  }

  switch (notification.type) {
    case 'delay_request':
      if (notification.extensionRequestId) {
        navigate(`/supervision?tab=delay&extensionId=${notification.extensionRequestId}`);
      } else if (notification.complaintId) {
        navigate(`/complaints/${notification.complaintId}`);
      }
      break;
    case 'delay_approve':
    case 'delay_reject':
    case 'return':
    case 'urge':
    case 'new_complaint':
    case 'review_pass':
      if (notification.complaintId) {
        navigate(`/complaints/${notification.complaintId}`);
      }
      break;
    default:
      break;
  }
};

const getQuickActionButton = (notification: Notification) => {
  switch (notification.type) {
    case 'delay_request':
      return {
        label: '立即审批',
        icon: <ThumbsUp size={14} />,
        className: 'text-purple-500 hover:text-purple-600',
      };
    case 'return':
      return {
        label: '重新办理',
        icon: <RotateCcw size={14} />,
        className: 'text-red-500 hover:text-red-600',
      };
    case 'urge':
      return {
        label: '加急处理',
        icon: <AlertTriangle size={14} />,
        className: 'text-orange-500 hover:text-orange-600',
      };
    case 'new_complaint':
      return {
        label: '受理派单',
        icon: <FileText size={14} />,
        className: 'text-blue-500 hover:text-blue-600',
      };
    case 'review_pass':
      return {
        label: '查看结果',
        icon: <CheckCircle size={14} />,
        className: 'text-green-500 hover:text-green-600',
      };
    case 'delay_approve':
    case 'delay_reject':
      return {
        label: '查看详情',
        icon: <Eye size={14} />,
        className: 'text-gray-500 hover:text-gray-600',
      };
    default:
      return null;
  }
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [activeTab, setActiveTab] = useState('unread');
  const [activeBusinessGroup, setActiveBusinessGroup] = useState<BusinessGroupKey>('delay_approve');

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/dashboard');
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    getActionButton(notification, navigate, markNotificationRead);
  };

  const handleJumpToComplaint = (e: React.MouseEvent, complaintId: string, notification: Notification) => {
    e.stopPropagation();
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }
    navigate(`/complaints/${complaintId}`);
  };

  const handleJumpToExtension = (e: React.MouseEvent, extensionRequestId: string, notification: Notification) => {
    e.stopPropagation();
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }
    navigate(`/supervision?tab=delay&extensionId=${extensionRequestId}`);
  };

  const handleQuickAction = (e: React.MouseEvent, notification: Notification) => {
    e.stopPropagation();
    handleNotificationClick(notification);
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const readCount = notifications.filter((n) => n.isRead).length;

  const currentGroup = businessGroups.find((g) => g.key === activeBusinessGroup)!;
  const filteredNotifications = useMemo(() => {
    return getGroupNotifications(notifications, currentGroup, activeTab);
  }, [notifications, currentGroup, activeTab]);

  const businessGroupTabs = useMemo(() => {
    return businessGroups.map((group) => {
      const count = getGroupNotifications(notifications, group, activeTab).length;
      const unreadInGroup = notifications.filter((n) => group.types.includes(n.type) && !n.isRead).length;
      return {
        key: group.key,
        label: (
          <span className="flex items-center gap-2">
            {group.label}
            {activeTab === 'unread' ? (
              unreadInGroup > 0 && <Badge count={unreadInGroup} size="small" />
            ) : (
              count > 0 && <Tag color="default" style={{ marginLeft: 4 }}>{count}</Tag>
            )}
          </span>
        ),
      };
    });
  }, [notifications, activeTab]);

  const readStatusTabs = [
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
          items={readStatusTabs}
          size="large"
        />
      </Card>

      <Card className="shadow-sm" styles={{ body: { padding: '12px 24px 0' } }}>
        <Tabs
          activeKey={activeBusinessGroup}
          onChange={(key) => setActiveBusinessGroup(key as BusinessGroupKey)}
          items={businessGroupTabs}
          size="middle"
        />
      </Card>

      <Card className="shadow-sm">
        {filteredNotifications.length === 0 ? (
          <Empty
            description={
              activeTab === 'unread'
                ? `暂无未读${currentGroup.label}通知`
                : activeTab === 'read'
                ? `暂无已读${currentGroup.label}通知`
                : `暂无${currentGroup.label}通知`
            }
            className="py-12"
          />
        ) : (
          <List
            dataSource={filteredNotifications}
            renderItem={(item) => {
              const quickAction = getQuickActionButton(item);
              return (
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
                      <div className="flex items-center gap-2 flex-wrap">
                        {!item.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                        )}
                        <span className="font-medium text-gray-800">{item.title}</span>
                        {getNotificationTag(item.type)}
                        <Space size={4} className="ml-auto">
                          {item.complaintId && (
                            <Tooltip title="查看投诉详情">
                              <Button
                                type="link"
                                size="small"
                                icon={<Eye size={14} />}
                                onClick={(e) => handleJumpToComplaint(e, item.complaintId!, item)}
                                className="!px-2 !py-0 !h-auto"
                              >
                                <span className="text-xs">{item.complaintId}</span>
                              </Button>
                            </Tooltip>
                          )}
                          {item.extensionRequestId && (
                            <Tooltip title="跳转延期审批">
                              <Button
                                type="link"
                                size="small"
                                icon={<ExternalLink size={14} />}
                                onClick={(e) => handleJumpToExtension(e, item.extensionRequestId!, item)}
                                className="!px-2 !py-0 !h-auto"
                              >
                                <span className="text-xs">{item.extensionRequestId}</span>
                              </Button>
                            </Tooltip>
                          )}
                        </Space>
                      </div>
                    }
                    description={
                      <div className="space-y-2">
                        <p className="text-gray-600 text-sm line-clamp-2">{item.content}</p>
                        <div className="flex items-center justify-between">
                          <p className="text-gray-400 text-xs">
                            {dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}
                          </p>
                          <Space size={12}>
                            {item.complaintId && (
                              <a
                                onClick={(e) => handleJumpToComplaint(e, item.complaintId!, item)}
                                className="text-blue-500 text-xs hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                查看工单
                                <ChevronRight size={12} />
                              </a>
                            )}
                            {item.extensionRequestId && (
                              <a
                                onClick={(e) => handleJumpToExtension(e, item.extensionRequestId!, item)}
                                className="text-purple-500 text-xs hover:text-purple-600 hover:underline cursor-pointer flex items-center gap-0.5"
                              >
                                前往审批
                                <ChevronRight size={12} />
                              </a>
                            )}
                            {quickAction && (
                              <Button
                                type="text"
                                size="small"
                                icon={quickAction.icon}
                                onClick={(e) => handleQuickAction(e, item)}
                                className={`!px-1 !py-0 !h-auto ${quickAction.className}`}
                              >
                                <span className="text-xs font-medium">{quickAction.label}</span>
                              </Button>
                            )}
                          </Space>
                        </div>
                      </div>
                    }
                  />
                </List.Item>
              );
            }}
            split
            className="notification-list"
          />
        )}
      </Card>
    </div>
  );
};

export default NotificationCenter;
