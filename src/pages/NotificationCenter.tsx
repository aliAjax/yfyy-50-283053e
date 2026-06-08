import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Badge, Button, Card, Empty, List, Segmented, Space, Tag } from 'antd';
import {
  Bell,
  CheckCircle2,
  Clock,
  RotateCcw,
  ShieldCheck,
  TimerReset,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { useAppStore } from '@/store/appStore';
import type { BusinessNotification, NotificationType } from '@/types';

type NotificationFilter = 'unread' | 'read' | 'all';

const notificationMeta: Record<
  NotificationType,
  { color: string; icon: ReactNode; label: string; iconClassName: string }
> = {
  urge: {
    color: 'orange',
    icon: <Bell size={18} />,
    label: '催办',
    iconClassName: 'bg-orange-50 text-orange-600',
  },
  delay_request: {
    color: 'purple',
    icon: <Clock size={18} />,
    label: '延期审批',
    iconClassName: 'bg-purple-50 text-purple-600',
  },
  delay_approve: {
    color: 'green',
    icon: <TimerReset size={18} />,
    label: '延期通过',
    iconClassName: 'bg-green-50 text-green-600',
  },
  delay_reject: {
    color: 'red',
    icon: <TimerReset size={18} />,
    label: '延期驳回',
    iconClassName: 'bg-red-50 text-red-600',
  },
  return: {
    color: 'red',
    icon: <RotateCcw size={18} />,
    label: '退回重办',
    iconClassName: 'bg-red-50 text-red-600',
  },
  review: {
    color: 'blue',
    icon: <ShieldCheck size={18} />,
    label: '审核通过',
    iconClassName: 'bg-blue-50 text-blue-600',
  },
};

const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [filter, setFilter] = useState<NotificationFilter>('unread');

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;
  const readCount = notifications.length - unreadCount;

  const filteredNotifications = useMemo(() => {
    if (filter === 'unread') {
      return notifications.filter((notification) => !notification.isRead);
    }
    if (filter === 'read') {
      return notifications.filter((notification) => notification.isRead);
    }
    return notifications;
  }, [filter, notifications]);

  const handleOpenNotification = (notification: BusinessNotification) => {
    markNotificationRead(notification.id);
    navigate(notification.targetPath);
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">通知中心</h2>
            <p className="text-sm text-gray-500 mt-1">
              汇总催办、延期审批、退回重办和审核通过提醒
            </p>
          </div>
          <Space wrap>
            <Segmented
              value={filter}
              onChange={(value) => setFilter(value as NotificationFilter)}
              options={[
                { label: `未读 ${unreadCount}`, value: 'unread' },
                { label: `已读 ${readCount}`, value: 'read' },
                { label: `全部 ${notifications.length}`, value: 'all' },
              ]}
            />
            <Button
              icon={<CheckCircle2 size={16} />}
              disabled={unreadCount === 0}
              onClick={markAllNotificationsRead}
            >
              全部已读
            </Button>
          </Space>
        </div>
      </Card>

      <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
        <List
          dataSource={filteredNotifications}
          locale={{ emptyText: <Empty description="暂无通知" /> }}
          renderItem={(notification) => {
            const meta = notificationMeta[notification.type];
            return (
              <List.Item
                className="cursor-pointer hover:bg-blue-50/50 transition-colors"
                onClick={() => handleOpenNotification(notification)}
              >
                <div className="w-full px-6 py-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1 flex h-10 w-10 items-center justify-center rounded-lg ${meta.iconClassName}`}
                    >
                      {meta.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge dot={!notification.isRead}>
                          <span className="font-medium text-gray-800">
                            {notification.title}
                          </span>
                        </Badge>
                        <Tag color={meta.color}>{meta.label}</Tag>
                        <span className="text-xs text-gray-400">
                          {dayjs(notification.createdAt).format('YYYY-MM-DD HH:mm')}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-gray-600">
                        {notification.content}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        {notification.complaintId && (
                          <span>投诉编号：{notification.complaintId}</span>
                        )}
                        {notification.extensionRequestId && (
                          <span>延期申请：{notification.extensionRequestId}</span>
                        )}
                      </div>
                    </div>
                    <Button type="link" size="small">
                      查看
                    </Button>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      </Card>
    </div>
  );
};

export default NotificationCenter;
