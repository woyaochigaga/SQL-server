import React, { useEffect, useState } from 'react';
import { Layout, Card, List, Avatar, Tag, Spin, Table, Modal, Descriptions, message, Button, Form, Input, DatePicker, Select } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import courseCover from '../imgs/Course_cover.jpeg';
import axios from 'axios';
import moment from 'moment';

const { Sider, Content } = Layout;

const mockTasks = [
  { id: 1, type: '签到', title: '教务课考勤', status: '已结束', endTime: '06-06 15:15' },
  { id: 2, type: '签到', title: '教务课考勤', status: '已结束', endTime: '05-30 15:15' },
  { id: 3, type: '签到', title: '教务课考勤', status: '已结束', endTime: '05-23 15:15' },
  { id: 4, type: '签到', title: '教务课考勤', status: '已结束', endTime: '05-16 15:15' },
  { id: 5, type: '签到', title: '教务课考勤', status: '已结束', endTime: '05-09 15:15' },
  { id: 6, type: '签到', title: '教务课考勤', status: '已结束', endTime: '05-02 15:15' },
  { id: 7, type: '签到', title: '教务课考勤', status: '已结束', endTime: '04-25 15:15' },
  { id: 8, type: '签到', title: '教务课考勤', status: '已结束', endTime: '04-18 15:15' },
];

const menuItems = [
  { key: 'tasks', label: '任务' },
  { key: 'chapters', label: '章节' },
  { key: 'discussion', label: '讨论' },
  { key: 'homework', label: '作业' },
  { key: 'exam', label: '考试' },
  { key: 'materials', label: '资料' },
  { key: 'record', label: '学习记录' },
];

const CourseDetail = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMenu, setSelectedMenu] = useState('tasks');
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [studentDetail, setStudentDetail] = useState(null);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [addStudentModalOpen, setAddStudentModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [activityForm] = Form.useForm();
  const activityTypes = [
    { label: '签到', value: '出席' },
    { label: '考试', value: '考试' },
    { label: '通知选课', value: '通知选课' },
    { label: '其他', value: '其他' }
  ];

  useEffect(() => {
    // 获取课程详情和学生列表
    const fetchData = async () => {
      setLoading(true);
      setLoadingStudents(true);
      try {
        // 课程详情（如有API可替换）
        const courseRes = await axios.post('http://localhost:3001/api/course-detail', { courseId });
        setCourse(courseRes.data.course || {});
        // 学生列表
        const stuRes = await axios.post('http://localhost:3001/api/course-students', { courseId });
        setStudents(stuRes.data.students || []);
      } catch (err) {
        message.error('加载课程或学生信息失败');
      } finally {
        setLoading(false);
        setLoadingStudents(false);
      }
    };
    fetchData();
  }, [courseId]);

  // 学生表格列定义
  const studentColumns = [
    { title: '学号', dataIndex: 'StudentNumber', key: 'StudentNumber' },
    { title: '姓名', dataIndex: 'Name', key: 'Name', render: (text, record) => <a onClick={() => { setStudentDetail(record); setStudentModalOpen(true); }}>{text}</a> },
    { title: '性别', dataIndex: 'Gender', key: 'Gender' },
    { title: '邮箱', dataIndex: 'Email', key: 'Email' },
    { title: '电话', dataIndex: 'Phone', key: 'Phone' },
  ];

  const handleAddStudent = async (values) => {
    try {
      // 调用后端接口添加学生到课程中
      await axios.post('http://localhost:3001/api/add-student-to-course', { courseId, studentNumber: values.studentNumber, name: values.name });
      message.success('添加学生成功');
      setAddStudentModalOpen(false);
      activityForm.resetFields();
      // 重新加载学生列表
      const stuRes = await axios.post('http://localhost:3001/api/course-students', { courseId });
      setStudents(stuRes.data.students || []);
    } catch (err) {
      message.error('添加学生失败');
    }
  };

  const handlePublishActivity = async () => {
    try {
      const values = await activityForm.validateFields();
      const user = JSON.parse(localStorage.getItem('user'));
      await axios.post('http://localhost:3001/api/course-activity', {
        courseId: courseId,
        activityType: values.activityType,
        activityDate: values.activityDate.format('YYYY-MM-DD'),
        comments: values.comments,
        recordedBy: user.id
      }, {
        headers: { Authorization: 'Bearer ' + localStorage.getItem('token') }
      });
      message.success('活动已发布');
      setActivityModalOpen(false);
      activityForm.resetFields();
    } catch (err) {
      message.error(err.response?.data?.message || '发布失败');
    }
  };

  return (
    <Layout style={{ background: 'transparent', minHeight: '100vh' }}>
      <Sider width={220} style={{ background: '#fff', minHeight: '100vh', boxShadow: '2px 0 8px #f0f1f2' }}>
        <div style={{ padding: 24, textAlign: 'center' }}>
          <img src={courseCover} alt="课程封面" style={{ width: 120, height: 120, borderRadius: 8, objectFit: 'cover', marginBottom: 16 }} />
          <div style={{ fontWeight: 600, fontSize: 18 }}>{course?.CourseName || ''}</div>
          <div style={{ color: '#888', margin: '8px 0' }}>{course?.TeacherName || ''}</div>
          <Tag color="blue" style={{ marginTop: 8 }}>{course?.Term || ''}</Tag>
        </div>
        <List
          itemLayout="horizontal"
          dataSource={menuItems}
          renderItem={item => (
            <List.Item
              style={{ cursor: 'pointer', background: selectedMenu === item.key ? '#f0f5ff' : undefined, padding: '12px 24px' }}
              onClick={() => setSelectedMenu(item.key)}
            >
              <span style={{ fontWeight: selectedMenu === item.key ? 600 : 400 }}>{item.label}</span>
            </List.Item>
          )}
        />
      </Sider>
      <Content style={{ background: 'transparent', padding: '32px 32px 0 32px' }}>
        <Card style={{ minHeight: 600, borderRadius: 12 }}>
          {loading ? <Spin /> : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ marginRight: 16 }}>返回</Button>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{course.CourseName} <span style={{ color: '#888', fontSize: 14 }}>{course.Term}</span></div>
              </div>
              {/* 任务/签到列表 */}
              {selectedMenu === 'tasks' && (
                <>
                  <Button type="primary" style={{ marginBottom: 16 }} onClick={() => setActivityModalOpen(true)}>
                    发布课程活动
                  </Button>
                  <Modal
                    open={activityModalOpen}
                    title="发布课程活动"
                    onCancel={() => setActivityModalOpen(false)}
                    onOk={handlePublishActivity}
                    okText="发布"
                  >
                    <Form form={activityForm} layout="vertical">
                      <Form.Item name="activityType" label="活动类型" rules={[{ required: true, message: '请选择活动类型' }]}> <Select options={activityTypes} /> </Form.Item>
                      <Form.Item name="activityDate" label="活动日期" rules={[{ required: true, message: '请选择日期' }]}> <DatePicker style={{ width: '100%' }} /> </Form.Item>
                      <Form.Item name="comments" label="活动说明"> <Input.TextArea rows={3} /> </Form.Item>
                    </Form>
                  </Modal>
                  <div style={{ fontWeight: 600, marginBottom: 16 }}>任务</div>
                  <div style={{ marginBottom: 12, color: '#888' }}>进行中 (0)</div>
                  <div style={{ marginBottom: 12, color: '#888' }}>已结束 ({mockTasks.length})</div>
                  <List
                    dataSource={mockTasks}
                    renderItem={item => (
                      <List.Item style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                        <Tag color="gray">{item.type}</Tag>
                        <span style={{ flex: 1 }}>{item.title}</span>
                        <span style={{ color: '#888', fontSize: 13 }}>结束时间：{item.endTime}</span>
                      </List.Item>
                    )}
                  />
                  {/* 学生列表 */}
                  <Card style={{ marginTop: 32 }} title="学生列表" variant="outlined" extra={<Button type="primary" onClick={() => setAddStudentModalOpen(true)}>添加学生</Button>}>
                    {loadingStudents ? <Spin /> : (
                      <Table
                        columns={studentColumns}
                        dataSource={students}
                        rowKey="StudentID"
                        pagination={false}
                        locale={{ emptyText: '暂无学生' }}
                        size="middle"
                      />
                    )}
                  </Card>
                  <Modal
                    open={studentModalOpen}
                    title={studentDetail ? `学生详情：${studentDetail.Name}` : ''}
                    onCancel={() => setStudentModalOpen(false)}
                    footer={null}
                  >
                    {studentDetail && (
                      <Descriptions bordered column={1} size="middle">
                        <Descriptions.Item label="学号">{studentDetail.StudentNumber}</Descriptions.Item>
                        <Descriptions.Item label="姓名">{studentDetail.Name}</Descriptions.Item>
                        <Descriptions.Item label="性别">{studentDetail.Gender}</Descriptions.Item>
                        <Descriptions.Item label="邮箱">{studentDetail.Email}</Descriptions.Item>
                        <Descriptions.Item label="电话">{studentDetail.Phone}</Descriptions.Item>
                        {/* 可扩展更多字段 */}
                      </Descriptions>
                    )}
                  </Modal>
                  <Modal
                    open={addStudentModalOpen}
                    title="添加学生"
                    onCancel={() => setAddStudentModalOpen(false)}
                    footer={null}
                  >
                    <Form form={form} onFinish={handleAddStudent}>
                      <Form.Item name="studentNumber" label="学号" rules={[{ required: true, message: '请输入学号' }]}> <Input /> </Form.Item>
                      <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}> <Input /> </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit">提交</Button>
                      </Form.Item>
                    </Form>
                  </Modal>
                </>
              )}
              {/* 其他菜单可扩展 */}
              {selectedMenu !== 'tasks' && (
                <div style={{ color: '#888', textAlign: 'center', marginTop: 80 }}>该模块暂未实现</div>
              )}
            </>
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default CourseDetail; 