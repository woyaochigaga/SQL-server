import React, { useState, useEffect } from 'react';
import { Descriptions, Avatar, Typography, Button, Tag, Divider, Row, Col, Form, Input, Select, message } from 'antd';
import { UserOutlined, EditOutlined, MailOutlined, PhoneOutlined, IdcardOutlined, TeamOutlined, ApartmentOutlined, ArrowLeftOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const roleColor = {
  student: 'blue',
  teacher: 'green',
  admin: 'red',
};

const roleLabel = {
  student: '学生',
  teacher: '教师',
  admin: '管理员',
};

const genderOptions = [
  { value: '男', label: '男' },
  { value: '女', label: '女' },
  { value: '其他', label: '其他' },
];

const UserInfo = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  useEffect(() => {
    // 从localStorage获取用户信息
    const user = localStorage.getItem('user');
    if (user) {
      setUserInfo(JSON.parse(user));
    }
  }, []);

  // 进入编辑时初始化 editData
  useEffect(() => {
    if (editing && userInfo) {
      const detail = userInfo.detailInfo || {};
      setEditData({
        Email: userInfo.email || '',
        Phone: userInfo.phone || '',
        Gender: detail.Gender || '',
        Age: detail.Age !== undefined && detail.Age !== null ? String(detail.Age) : '',
        ClassID: detail.ClassID || '',
        Address: detail.Address || '',
        Title: detail.Title || '',
        Department: detail.Department || ''
      });
    }
  }, [editing, userInfo]);

  if (!userInfo) {
    return <div style={{textAlign:'center',marginTop:100}}>加载中...</div>;
  }

  // 详细信息（学生/教师）
  const detail = userInfo.detailInfo || {};

  // 返回按钮跳转逻辑
  const handleBack = () => {
    if (userInfo.role === 'student') {
      navigate('/students');
    } else if (userInfo.role === 'teacher') {
      navigate('/teachers');
    } else if (userInfo.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/');
    }
  };

  // 保存编辑
  const handleSave = async (e) => {
    e.preventDefault && e.preventDefault();
    try {
      const payload = {
        userId: userInfo.id,
        role: userInfo.role,
        ...editData
      };
      const res = await axios.post('http://localhost:3001/api/update-profile', payload);
      const newUser = { ...userInfo, ...res.data.userInfo, detailInfo: res.data.detailInfo };
      setUserInfo(newUser);
      localStorage.setItem('user', JSON.stringify(newUser));
      setEditing(false);
      message.success('信息已更新！');
    } catch (err) {
      message.error(err.response?.data?.message || '更新失败，请稍后重试');
    }
  };

  // 渲染表单项
  const renderEditForm = () => {
    if (!editData) return null;
    return (
      <form onSubmit={handleSave} style={{padding: 24}}>
        <Row gutter={32}>
          <Col xs={24} md={12}>
            <div style={{marginBottom: 16}}>
              <label>邮箱</label>
              <Input value={editData.Email} onChange={e => setEditData(d => ({...d, Email: e.target.value}))} />
            </div>
            <div style={{marginBottom: 16}}>
              <label>手机号</label>
              <Input value={editData.Phone} onChange={e => setEditData(d => ({...d, Phone: e.target.value}))} />
            </div>
            <div style={{marginBottom: 16}}>
              <label>性别</label>
              <Select
                value={editData.Gender}
                onChange={val => setEditData(d => ({...d, Gender: val}))}
                options={genderOptions}
                allowClear
                placeholder="请选择性别"
              />
            </div>
            {userInfo.role === 'student' && (
              <>
                <div style={{marginBottom: 16}}>
                  <label>年龄</label>
                  <Input type="number" min={1} max={100} value={editData.Age} onChange={e => setEditData(d => ({...d, Age: e.target.value}))} />
                </div>
                <div style={{marginBottom: 16}}>
                  <label>班级ID</label>
                  <Input value={editData.ClassID} onChange={e => setEditData(d => ({...d, ClassID: e.target.value}))} />
                </div>
                <div style={{marginBottom: 16}}>
                  <label>住址</label>
                  <Input value={editData.Address} onChange={e => setEditData(d => ({...d, Address: e.target.value}))} />
                </div>
              </>
            )}
            {userInfo.role === 'teacher' && (
              <>
                <div style={{marginBottom: 16}}>
                  <label>职称</label>
                  <Input value={editData.Title} onChange={e => setEditData(d => ({...d, Title: e.target.value}))} />
                </div>
                <div style={{marginBottom: 16}}>
                  <label>院系</label>
                  <Input value={editData.Department} onChange={e => setEditData(d => ({...d, Department: e.target.value}))} />
                </div>
              </>
            )}
          </Col>
        </Row>
        <div style={{textAlign:'center', marginTop: 24}}>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} style={{marginRight: 16}}>保存</Button>
          <Button icon={<CloseOutlined />} onClick={() => setEditing(false)}>取消</Button>
        </div>
      </form>
    );
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #e0e7ef 60%, #f5f7fa 100%)',
      padding: 0,
    }}>
      {/* 顶部横幅 */}
      <div style={{
        width: '100%',
        background: 'linear-gradient(90deg, #1890ff 60%, #40a9ff 100%)',
        padding: '0 0 36px 0',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxShadow: '0 4px 24px 0 rgba(24,144,255,0.08)',
        marginBottom: 0,
        position: 'relative',
      }}>
        <div style={{
          width: '100%',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          position: 'absolute',
          top: 0,
          left: 0,
          padding: '32px 0 0 32px',
        }}>
          <Button
            type="primary"
            icon={<ArrowLeftOutlined style={{fontSize:22}} />}
            onClick={handleBack}
            size="large"
            style={{
              borderRadius: 24,
              fontWeight: 600,
              boxShadow: '0 2px 8px #1890ff33',
              background: '#fff',
              color: '#1890ff',
              border: 'none',
              padding: '0 22px',
              height: 44,
            }}
          >
            返回
          </Button>
        </div>
        {/* 头像+名字+角色标签 居中对齐 */}
        <div style={{paddingTop: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
          <Avatar size={110} icon={<UserOutlined />} style={{background:'#fff', color:'#1890ff', marginBottom: 18, boxShadow:'0 2px 12px #1890ff22'}} />
          <Title level={2} style={{color:'#fff', margin:0, fontWeight:700, textAlign:'center', letterSpacing:2}}>{userInfo.username}</Title>
          <Tag color={roleColor[userInfo.role] || 'default'} style={{fontSize:18, padding:'4px 24px', marginTop:12, background:'#fff', color:'#1890ff', border:'none', textAlign:'center'}}>
            {roleLabel[userInfo.role] || userInfo.role}
          </Tag>
        </div>
      </div>
      {/* 信息分区贴满，无左右留白 */}
      <div style={{width: '100%', padding: 0}}>
        {editing ? (
          renderEditForm()
        ) : (
          <>
            <Row gutter={[32, 32]} style={{margin: 0}}>
              <Col xs={24} md={12} style={{paddingLeft: 0, paddingRight: 0}}>
                <div style={{background:'#fff', borderRadius:0, boxShadow:'0 2px 12px #e6f7ff', padding:'32px 18px 24px 18px', minHeight: 320}}>
                  <Title level={4} style={{marginBottom:24, color:'#1890ff', textAlign:'center'}}><IdcardOutlined /> 基本信息</Title>
                  <Descriptions column={1} labelStyle={{fontWeight:600, width:110}} contentStyle={{fontSize:15}}>
                    <Descriptions.Item label={<span><MailOutlined /> 邮箱</span>}>{userInfo.email || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                    <Descriptions.Item label={<span><PhoneOutlined /> 手机号</span>}>{userInfo.phone || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                   
                  </Descriptions>
                </div>
              </Col>
              <Col xs={24} md={12} style={{paddingLeft: 0, paddingRight: 0}}>
                {userInfo.role === 'student' && detail.StudentNumber && (
                  <div style={{background:'#fff', borderRadius:0, boxShadow:'0 2px 12px #e6f7ff', padding:'32px 18px 24px 18px', minHeight: 320}}>
                    <Title level={4} style={{marginBottom:24, color:'#52c41a', textAlign:'center'}}><TeamOutlined /> 学生信息</Title>
                    <Descriptions column={1} labelStyle={{fontWeight:600, width:110}} contentStyle={{fontSize:15}}>
                      <Descriptions.Item label="学号">{detail.StudentNumber}</Descriptions.Item>
                      <Descriptions.Item label="姓名">{detail.Name}</Descriptions.Item>
                      <Descriptions.Item label="性别">{detail.Gender || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                      <Descriptions.Item label="年龄">{detail.Age || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                      <Descriptions.Item label="班级">{detail.ClassID || <Text type="secondary">未分班</Text>}</Descriptions.Item>
                    </Descriptions>
                  </div>
                )}
                {userInfo.role === 'teacher' && detail.TeacherNumber && (
                  <div style={{background:'#fff', borderRadius:0, boxShadow:'0 2px 12px #e6f7ff', padding:'32px 18px 24px 18px', minHeight: 320}}>
                    <Title level={4} style={{marginBottom:24, color:'#faad14', textAlign:'center'}}><ApartmentOutlined /> 教师信息</Title>
                    <Descriptions column={1} labelStyle={{fontWeight:600, width:110}} contentStyle={{fontSize:15}}>
                      <Descriptions.Item label="工号">{detail.TeacherNumber}</Descriptions.Item>
                      <Descriptions.Item label="姓名">{detail.Name}</Descriptions.Item>
                      <Descriptions.Item label="性别">{detail.Gender || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                      <Descriptions.Item label="职称">{detail.Title || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                      <Descriptions.Item label="院系">{detail.Department || <Text type="secondary">未填写</Text>}</Descriptions.Item>
                    </Descriptions>
                  </div>
                )}
              </Col>
            </Row>
            <Divider style={{margin:'48px 0 24px 0'}}/>
            <div style={{textAlign:'center'}}>
              <Button type="primary" icon={<EditOutlined />} size="large" style={{borderRadius: 20, padding: '0 32px'}} onClick={() => setEditing(true)}>
                编辑信息
              </Button>
              {editing && editData && (
                <div style={{maxWidth: 600, margin: '32px auto'}}>
                  {renderEditForm()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UserInfo; 