import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Avatar, Dropdown, Space } from 'antd';
import { UserOutlined, LogoutOutlined, UserSwitchOutlined } from '@ant-design/icons';
import './App.css';

// 导入页面组件
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import StudentList from './pages/StudentList';
import TeacherList from './pages/TeacherList';
import CourseList from './pages/CourseList';
import GradeManagement from './pages/GradeManagement';
import Admin from './pages/admin';
import UserInfo from './pages/userinfo';
import CourseDetail from './pages/CourseDetail';
import GradeList from './pages/GradeList';
import ClassDetail from './pages/ClassDetail';


const { Header, Content, Footer } = Layout;

// 受保护路由组件
function ProtectedRoute({ children }) {
  const user = localStorage.getItem('user');
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 从localStorage获取用户信息
    const userInfo = localStorage.getItem('user');
    if (userInfo) {
      setUser(JSON.parse(userInfo));
    } else {
      setUser(null);
    }
  }, [location]); // location变化时重新获取

  const handleLogout = () => {
    // 只删除本系统相关的缓存
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // 跳转到登录页
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'userinfo',
      icon: <UserSwitchOutlined />,
      label: '个人信息',
      onClick: () => navigate('/userinfo')
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  // 判断当前是否为登录或注册页面
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // 根路径重定向逻辑
  function getHomeRedirect() {
    if (!user) return <Navigate to="/login" replace />;
    if (user.role === 'student') return <Navigate to="/students" replace />;
    if (user.role === 'teacher') return <Navigate to="/teachers" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Layout className="layout">
      <Header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="logo">教务系统</div>
        {!isAuthPage && user && (
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Space style={{ cursor: 'pointer', color: '#fff' }}>
              <Avatar icon={<UserOutlined />} />
              <span>{user.username}</span>
            </Space>
          </Dropdown>
        )}
      </Header>
      <Content style={{ padding: 0 }}>
        <div className="site-layout-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><StudentList /></ProtectedRoute>} />
            <Route path="/teachers" element={<ProtectedRoute><TeacherList /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><CourseList /></ProtectedRoute>} />
            <Route path="/grades" element={<ProtectedRoute><GradeManagement /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/userinfo" element={<ProtectedRoute><UserInfo /></ProtectedRoute>} />
            <Route path="/course/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
            <Route path="/grade/:courseId" element={<GradeList />} />
            <Route path="/class/:classId" element={<ProtectedRoute><ClassDetail /></ProtectedRoute>} />
            {/* 根路径智能重定向 */}
            <Route path="/" element={getHomeRedirect()} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center' }}>
        教务系统 ©{new Date().getFullYear()}
      </Footer>
    </Layout>
  );
}

export default App; 