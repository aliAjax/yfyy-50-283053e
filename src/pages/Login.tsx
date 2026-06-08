import { Form, Input, Button, Card, message } from 'antd';
import { User, Lock, LogIn, Send, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import type { User as UserType } from '@/types';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAppStore();
  const [form] = Form.useForm();

  const handleLogin = (values: { username: string; password: string }) => {
    const mockUser: UserType = {
      id: '1',
      username: values.username,
      name: '管理员',
      role: '系统管理员',
      department: '城市管理委员会',
    };
    setUser(mockUser);
    message.success('登录成功');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-blue-300 blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-blue-400 blur-3xl opacity-20"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <span className="text-2xl font-bold text-blue-600">城</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">城市治理投诉建议平台</h1>
          <p className="text-blue-200 text-sm">构建城市治理闭环，提升市民满意度</p>
        </div>

        <Card
          className="backdrop-blur-lg bg-white/95 shadow-2xl border-0 rounded-2xl"
          styles={{ body: { padding: '32px' } }}
        >
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-800">账号登录</h2>
            <p className="text-gray-500 text-sm mt-1">请输入您的账号信息</p>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleLogin}
            initialValues={{ username: 'admin', password: '123456' }}
          >
            <Form.Item
              name="username"
              label="用户名"
              rules={[{ required: true, message: '请输入用户名' }]}
            >
              <Input
                size="large"
                prefix={<User size={18} className="text-gray-400" />}
                placeholder="请输入用户名"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="密码"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                size="large"
                prefix={<Lock size={18} className="text-gray-400" />}
                placeholder="请输入密码"
                className="rounded-lg"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                block
                className="h-11 rounded-lg font-medium text-base bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30"
                icon={<LogIn size={18} />}
              >
                登 录
              </Button>
            </Form.Item>

            <div className="flex justify-between items-center text-sm">
              <div className="text-gray-500">
                测试账号：<span className="text-blue-600">admin / 123456</span>
              </div>
            </div>
          </Form>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="default"
                block
                size="small"
                icon={<Send size={14} />}
                onClick={() => navigate('/submit')}
                className="text-blue-500 border-blue-200 hover:border-blue-400 hover:text-blue-600"
              >
                提交投诉
              </Button>
              <Button
                type="default"
                block
                size="small"
                icon={<Search size={14} />}
                onClick={() => navigate('/submit?tab=query')}
                className="text-blue-500 border-blue-200 hover:border-blue-400 hover:text-blue-600"
              >
                进度查询
              </Button>
            </div>
            <p className="text-center text-gray-400 text-xs mt-3">
              我是市民，点击上方按钮进入公众服务
            </p>
          </div>
        </Card>

        <div className="text-center mt-6 text-blue-200 text-xs">
          © 2024 城市治理投诉建议闭环平台 版权所有
        </div>
      </div>
    </div>
  );
};

export default Login;
