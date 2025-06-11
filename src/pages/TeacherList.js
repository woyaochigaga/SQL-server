import React, { useState, useEffect } from 'react';
import { Layout, Menu, message, Table, Card, List, Typography, Spin, Row, Col } from 'antd';
import {
  TeamOutlined,
  BookOutlined,
  FileDoneOutlined,
  CalendarOutlined,
  NotificationOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import axios from 'axios';
import courseCover from '../imgs/Course_cover.jpeg';
import { useNavigate } from 'react-router-dom';

const { Sider, Content } = Layout;

const menuItems = [
  { key: 'students', icon: <TeamOutlined />, label: '学生管理' },
  { key: 'courses', icon: <BookOutlined />, label: '课程管理' },
  { key: 'grades', icon: <FileDoneOutlined />, label: '成绩管理' },
  { key: 'attendance', icon: <CalendarOutlined />, label: '考勤管理' },
  { key: 'notices', icon: <NotificationOutlined />, label: '通知公告' },
  { key: 'more', icon: <AppstoreOutlined />, label: '更多功能' },
];

const TeacherList = () => {
  const [selectedKey, setSelectedKey] = useState('students');
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const fetchCourses = async () => {
      setLoadingCourses(true);
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const teacherId = user?.detailInfo?.TeacherID;
        if (!teacherId) return;
        const courseRes = await axios.post('http://localhost:3001/api/teacher-courses', { teacherId });
        const courses = courseRes.data.courses || [];
        setCourses(courses);
        localStorage.setItem('teacher_courses', JSON.stringify(courses));
      } catch (err) {
        message.error('加载课程失败');
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    const fetchClasses = async () => {
      setLoadingClasses(true);
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        const teacherId = user?.detailInfo?.TeacherID;
        if (!teacherId) return;
        const res = await axios.post('http://localhost:3001/api/teacher-classes', { teacherId });
        setClasses(res.data.classes || []);
      } catch (err) {
        message.error('加载班级失败');
      } finally {
        setLoadingClasses(false);
      }
    };
    fetchClasses();
  }, []);

  const handleCourseClick = async (course) => {
    navigate(`/course/${course.CourseID}`);
  };

  const handleClassClick = (cls) => {
    navigate(`/class/${cls.ClassID}`);
  };

  // 学生表格列定义
  const studentColumns = [
    { title: '学号', dataIndex: 'StudentNumber', key: 'StudentNumber' },
    { title: '姓名', dataIndex: 'Name', key: 'Name' },
    { title: '性别', dataIndex: 'Gender', key: 'Gender' },
    { title: '邮箱', dataIndex: 'Email', key: 'Email' },
    { title: '电话', dataIndex: 'Phone', key: 'Phone' },
  ];

  const courseCardCover = (course) => (
    <img
      alt="课程封面"
      src={courseCover}
      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8 }}
    />
  );

  const courseCard = (course) => (
    <Card
      variant="outlined"
      key={course.CourseID}
      style={{ width: 240, margin: '0 16px 24px 0', display: 'inline-block', verticalAlign: 'top', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
      cover={courseCardCover(course)}
      onClick={() => handleCourseClick(course)}
    >
      <Card.Meta
        title={<span style={{ fontWeight: 600 }}>{course.CourseName}</span>}
        description={
          <div>
            <div>授课教师：{course.TeacherName || '未知'}</div>
            <div>开课时间：{course.StartDate || '—'}</div>
            <div>结束时间：{course.EndDate || '—'}</div>
          </div>
        }
      />
    </Card>
  );

  const classCard = (cls) => (
    <Card
      variant="outlined"
      key={cls.ClassID}
      style={{ width: 240, margin: '0 16px 24px 0', display: 'inline-block', verticalAlign: 'top', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
      onClick={() => handleClassClick(cls)}
    >
      <Card.Meta
        title={<span style={{ fontWeight: 600 }}>{cls.ClassName}</span>}
        description={
          <div>
            <div>学生人数：{cls.StudentCount || 0}</div>
            <div style={{ color: '#888', fontSize: 13 }}>{cls.Description || ''}</div>
          </div>
        }
      />
    </Card>
  );

  const courseManagementContent = (
    <div style={{ minHeight: 500 }}>
      <h2 style={{ marginBottom: 24 }}>我的课程</h2>
      {loadingCourses ? (
        <Spin />
      ) : (
        <Row gutter={[24, 24]}>
          {courses.length === 0 ? (
            <Col span={24}><Card>暂无课程</Card></Col>
          ) : (
            courses.map(course => (
              <Col key={course.CourseID} xs={24} sm={12} md={8} lg={6} xl={6}>
                {courseCard(course)}
              </Col>
            ))
          )}
        </Row>
      )}
    </div>
  );

  const classManagementContent = (
    <div style={{ minHeight: 500 }}>
      <h2 style={{ marginBottom: 24 }}>我的班级</h2>
      {loadingClasses ? (
        <Spin />
      ) : (
        <Row gutter={[24, 24]}>
          {classes.length === 0 ? (
            <Col span={24}><Card>暂无班级</Card></Col>
          ) : (
            classes.map(cls => (
              <Col key={cls.ClassID} xs={24} sm={12} md={8} lg={6} xl={6}>
                {classCard(cls)}
              </Col>
            ))
          )}
        </Row>
      )}
    </div>
  );

  // 成绩管理卡片内容
  const gradeManagementContent = (
    <div style={{ minHeight: 500 }}>
      <h2 style={{ marginBottom: 24 }}>成绩管理</h2>
      <Row gutter={[24, 24]}>
        {(JSON.parse(localStorage.getItem('teacher_courses')) || []).map(course => (
          <Col key={course.CourseID} xs={24} sm={12} md={8} lg={6} xl={6}>
            <Card
              variant="outlined"
              style={{ width: 240, margin: '0 16px 24px 0', borderRadius: 12, boxShadow: '0 2px 8px #f0f1f2' }}
              cover={courseCardCover(course)}
              onClick={() => navigate(`/grade/${course.CourseID}`)}
            >
              <Card.Meta
                title={<span style={{ fontWeight: 600 }}>{course.CourseName}</span>}
                description={<div>授课教师：{course.TeacherName || '未知'}</div>}
              />
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  const contentMap = {
    students: classManagementContent,
    courses: courseManagementContent,
    grades: gradeManagementContent,
    attendance: <div><h2>考勤管理</h2><p>这里可以管理学生考勤、请假等。</p></div>,
    notices: <div><h2>通知公告</h2><p>这里可以发布和查看通知公告。</p></div>,
    more: <div><h2>更多功能</h2><p>这里可以扩展更多教师相关功能。</p></div>,
  };

  return (
    <Layout style={{ minHeight: '80vh', background: 'transparent' }}>
      <Sider width={180} style={{ background: 'transparent', paddingTop: 32 }}>
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

export default TeacherList; 