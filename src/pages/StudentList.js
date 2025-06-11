import React, { useState, useEffect } from 'react';
import { Layout, Menu, Card, Row, Col, Modal, Button, List, Tag } from 'antd';
import {
  HomeOutlined,
  FileDoneOutlined,
  CalendarOutlined,
  BookOutlined,
  NotificationOutlined
} from '@ant-design/icons';
import axios from 'axios';

const { Sider, Content } = Layout;

const menuItems = [
  { key: 'home', icon: <HomeOutlined />, label: '首页' },
  { key: 'grades', icon: <FileDoneOutlined />, label: '成绩' },
  { key: 'notices', icon: <NotificationOutlined />, label: '通知' },
  { key: 'attendance', icon: <CalendarOutlined />, label: '考勤' },
  { key: 'courses', icon: <BookOutlined />, label: '选课' },
 
];

const StudentList = () => {
  const [selectedKey, setSelectedKey] = useState('home');
  const [dashboard, setDashboard] = useState(null);
  const [studentCourses, setStudentCourses] = useState([]);
  const [scoreModal, setScoreModal] = useState({ open: false, course: null });
  const [studentActivities, setStudentActivities] = useState([]);
  const [activityModal, setActivityModal] = useState({ open: false, course: null, activities: [] });

  useEffect(() => {
    // 假设 localStorage 里有 user.detailInfo.StudentID
    const studentId = JSON.parse(localStorage.getItem('user'))?.detailInfo?.StudentID;
    if (studentId) {
      axios.get('http://localhost:3001/api/student-dashboard', {
        params: { studentId },
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      }).then(res => setDashboard(res.data));
      axios.get('http://localhost:3001/api/student-courses', {
        params: { studentId },
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      }).then(res => setStudentCourses(res.data.courses || []));
      axios.get('http://localhost:3001/api/student-activities', {
        params: { studentId },
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      }).then(res => setStudentActivities(res.data.activities || []));
    }
  }, []);

  const courseCardCover = (course) => (
    <img
      alt="课程封面"
      src={require('../imgs/Course_cover.jpeg')}
      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }}
    />
  );

  const courseCard = (course) => (
    <Card
      hoverable
      key={course.CourseID}
      style={{ width: 240, margin: '0 16px 24px 0', display: 'inline-block', verticalAlign: 'top', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
      cover={courseCardCover(course)}
      onClick={() => setScoreModal({ open: true, course })}
    >
      <Card.Meta
        title={<span style={{ fontWeight: 600 }}>{course.CourseName}</span>}
        description={
          <div>
            <div>授课教师：{course.TeacherName || '未知'}</div>
            <div>成绩：{course.Score !== null && course.Score !== undefined ? course.Score : '未出成绩'}</div>
          </div>
        }
      />
    </Card>
  );

  const getCourseActivities = (courseId) => studentActivities.filter(a => a.CourseID === courseId);

  const noticeCard = (course) => (
    <Card
      hoverable
      key={course.CourseID}
      style={{ width: 240, margin: '0 16px 24px 0', display: 'inline-block', verticalAlign: 'top', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
      cover={courseCardCover(course)}
      onClick={() => setActivityModal({ open: true, course, activities: getCourseActivities(course.CourseID) })}
    >
      <Card.Meta
        title={<span style={{ fontWeight: 600 }}>{course.CourseName}</span>}
        description={<div>授课教师：{course.TeacherName || '未知'}</div>}
      />
    </Card>
  );

  const gradesContent = (
    <div style={{ minHeight: 500 }}>
      <h2 style={{ marginBottom: 24 }}>我的课程</h2>
      <Row gutter={[24, 24]}>
        {studentCourses.length === 0 ? (
          <Col span={24}><Card>暂无课程</Card></Col>
        ) : (
          studentCourses.map(course => (
            <Col key={course.CourseID} xs={24} sm={12} md={8} lg={6} xl={6}>
              {courseCard(course)}
            </Col>
          ))
        )}
      </Row>
      <Modal
        open={scoreModal.open}
        title={scoreModal.course ? scoreModal.course.CourseName : ''}
        onCancel={() => setScoreModal({ open: false, course: null })}
        footer={<Button onClick={() => setScoreModal({ open: false, course: null })}>关闭</Button>}
      >
        {scoreModal.course && (
          <div>
            <p>课程代码：{scoreModal.course.CourseCode}</p>
            <p>授课教师：{scoreModal.course.TeacherName}</p>
            <p>成绩：{scoreModal.course.Score !== null && scoreModal.course.Score !== undefined ? scoreModal.course.Score : '未出成绩'}</p>
            <p>成绩录入时间：{scoreModal.course.GradeDate ? new Date(scoreModal.course.GradeDate).toLocaleString() : '—'}</p>
          </div>
        )}
      </Modal>
    </div>
  );

  const noticesContent = (
    <div style={{ minHeight: 500 }}>
      <h2 style={{ marginBottom: 24 }}>课程通知/活动</h2>
      <Row gutter={[24, 24]}>
        {studentCourses.length === 0 ? (
          <Col span={24}><Card>暂无课程</Card></Col>
        ) : (
          studentCourses.map(course => (
            <Col key={course.CourseID} xs={24} sm={12} md={8} lg={6} xl={6}>
              {noticeCard(course)}
            </Col>
          ))
        )}
      </Row>
      <Modal
        open={activityModal.open}
        title={activityModal.course ? activityModal.course.CourseName + ' - 活动通知' : ''}
        onCancel={() => setActivityModal({ open: false, course: null, activities: [] })}
        footer={<Button onClick={() => setActivityModal({ open: false, course: null, activities: [] })}>关闭</Button>}
      >
        {activityModal.activities.length === 0 ? (
          <div style={{ color: '#888' }}>暂无活动</div>
        ) : (
          <List
            dataSource={activityModal.activities}
            renderItem={item => (
              <List.Item>
                <div>
                  <Tag color="blue">{item.Status}</Tag>
                  <span style={{ marginLeft: 8 }}>{item.Comments || '无内容'}</span>
                  <span style={{ marginLeft: 16, color: '#888' }}>{item.AttendanceDate ? new Date(item.AttendanceDate).toLocaleDateString() : ''}</span>
                </div>
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );

  const contentMap = {
    home: (
      <div style={{ padding: 24 }}>
        <h2 style={{ marginBottom: 24 }}>学业概况</h2>
        <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
          <div style={{ background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 8, padding: 24, minWidth: 180 }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#52c41a' }}>{dashboard ? dashboard.gpa : '--'}</div>
            <div style={{ color: '#888', marginTop: 8 }}>GPA</div>
          </div>
          <div style={{ background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: 8, padding: 24, minWidth: 180 }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1890ff' }}>{dashboard ? dashboard.passedCredits : '--'}</div>
            <div style={{ color: '#888', marginTop: 8 }}>已修学分</div>
          </div>
          <div style={{ background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 8, padding: 24, minWidth: 180 }}>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#faad14' }}>{dashboard ? dashboard.failedCount : '--'}</div>
            <div style={{ color: '#888', marginTop: 8 }}>挂科数</div>
          </div>
        </div>
        <h2 style={{ marginBottom: 24 }}>班级概况</h2>
        <div style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 8, padding: 24, marginBottom: 32, maxWidth: 600 }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>所在班级：{dashboard ? dashboard.className : '--'}</div>
          <div style={{ marginBottom: 4 }}>班主任：{dashboard ? dashboard.teacherName : '--'}</div>
          <div style={{ marginBottom: 4 }}>联系方式：{dashboard ? dashboard.teacherEmail : '--'} / {dashboard ? dashboard.teacherPhone : '--'}</div>
          <div style={{ marginBottom: 4 }}>职位：{dashboard ? dashboard.teacherTitle : '--'}</div>
          <div>学院：{dashboard ? dashboard.department : '--'}</div>
        </div>
        <h2 style={{ marginBottom: 16 }}>待办事项</h2>
        <ul style={{ fontSize: 16, lineHeight: 2 }}>
          <li>【选课】请在本周内完成下学期课程选择</li>
          <li>【成绩】查看最新期末成绩</li>
          <li>【考勤】补交本月缺勤说明</li>
          <li>【通知】阅读教务系统最新公告</li>
        </ul>
      </div>
    ),
    grades: gradesContent,
    attendance: <div><h2>考勤记录</h2><p>这里可以展示出勤、请假等信息。</p></div>,
    courses: <div><h2>选课中心</h2><p>这里可以进行课程选修、退选等操作。</p></div>,
    notices: noticesContent,
  };

  return (
    <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
      <Sider width={180} style={{ background: '#f0f2f5', height: '100vh', minHeight: '100vh', margin: 0, padding: 0 }}>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ height: '100%', borderRight: 0, fontSize: 16 }}
          items={menuItems}
          onClick={({ key }) => setSelectedKey(key)}
        />
      </Sider>
      <Content style={{ padding: '40px 32px', background: 'transparent' }}>
        {contentMap[selectedKey]}
      </Content>
    </Layout>
  );
};

export default StudentList; 