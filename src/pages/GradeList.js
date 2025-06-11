import React, { useEffect, useState } from 'react';
import { Table, Card, Button, Modal, Form, InputNumber, message, Popconfirm } from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

// axios 实例，自动带 token
const axiosAuth = axios.create();
axiosAuth.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = 'Bearer ' + token;
  }
  return config;
});

const GradeList = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));
  const [students, setStudents] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addStudent, setAddStudent] = useState(null);
  const [addForm] = Form.useForm();
  const [form] = Form.useForm();

  // 获取学生和成绩
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 获取学生列表
        const stuRes = await axiosAuth.post('http://localhost:3001/api/course-students', { courseId });
        const students = stuRes.data.students || [];
        setStudents(students);
        // 获取成绩列表
        const gradeRes = await axiosAuth.get('http://localhost:3001/api/grades', { params: { courseId } });
        console.log('获取到的成绩数据:', gradeRes.data); // 调试日志
        console.log('获取到的学生数据:', students); // 新增调试日志
        setGrades(gradeRes.data || []);
      } catch (err) {
        console.error('加载数据失败:', err); // 调试日志
        message.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [courseId]);

  // 获取学生成绩
  const getStudentScore = (studentId) => {
    const g = grades.find(g => g.StudentID === studentId);
    console.log('查找学生成绩:', { studentId, grade: g }); // 调试日志
    return g ? g.Score : '';
  };
  // 获取学生成绩ID（通过学号匹配）
  const getGradeId = (studentNumber) => {
    const g = grades.find(g => g.StudentNumber === studentNumber);
    return g ? g.GradeID : null;
  };

  // 编辑成绩
  const handleEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue({ score: getStudentScore(record.StudentID) });
    setEditModalOpen(true);
  };
  const handleEditOk = async () => {
    try {
      const values = await form.validateFields();
      await axiosAuth.post('http://localhost:3001/api/update-grade', {
        gradeId: getGradeId(editRecord.StudentNumber),
        score: values.score
      });
      message.success('成绩已更新');
      setEditModalOpen(false);
      setEditRecord(null);
      // 刷新成绩
      const gradeRes = await axiosAuth.get('http://localhost:3001/api/grades', { params: { courseId } });
      setGrades(gradeRes.data || []);
    } catch (err) {
      message.error('成绩更新失败');
    }
  };

  // 新增成绩（受控Modal方式）
  const handleAdd = (student) => {
    setAddStudent(student);
    setAddModalOpen(true);
    addForm.resetFields();
  };
  const handleAddOk = async () => {
    try {
      const values = await addForm.validateFields();
      await axiosAuth.post('http://localhost:3001/api/add-grade', {
        studentId: addStudent.StudentID,
        courseId,
        score: values.score,
        comments: '',
        createdBy: user?.id
      });
      message.success('成绩已添加');
      setAddModalOpen(false);
      addForm.resetFields();
      // 刷新成绩
      const gradeRes = await axiosAuth.get('http://localhost:3001/api/grades', { params: { courseId } });
      setGrades(gradeRes.data || []);
    } catch (err) {
      message.error('成绩添加失败');
    }
  };

  // 删除成绩
  const handleDelete = async (student) => {
    try {
      await axiosAuth.post('http://localhost:3001/api/delete-grade', {
        gradeId: getGradeId(student.StudentNumber)
      });
      message.success('成绩已删除');
      // 刷新成绩
      const gradeRes = await axiosAuth.get('http://localhost:3001/api/grades', { params: { courseId } });
      setGrades(gradeRes.data || []);
    } catch (err) {
      message.error('成绩删除失败');
    }
  };

  const columns = [
    { title: '学号', dataIndex: 'StudentNumber', key: 'StudentNumber' },
    { title: '姓名', dataIndex: 'Name', key: 'Name' },
    { 
      title: '成绩', 
      key: 'Score', 
      render: (_, record) => {
        const grade = grades.find(g => g.StudentNumber === record.StudentNumber);
        return grade ? grade.Score : '-';
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => {
        const grade = grades.find(g => g.StudentNumber === record.StudentNumber);
        return (
          <>
            {grade ? (
              <>
                <Button 
                  size="small" 
                  type="primary"
                  onClick={() => handleEdit(record)} 
                  style={{ marginRight: 8 }}
                >
                  修改成绩
                </Button>
                <Popconfirm 
                  title="确定删除成绩？" 
                  onConfirm={() => handleDelete(record)}
                >
                  <Button size="small" danger>删除</Button>
                </Popconfirm>
              </>
            ) : (
              <Button 
                size="small" 
                type="primary" 
                onClick={() => handleAdd(record)}
              >
                添加成绩
              </Button>
            )}
          </>
        );
      }
    }
  ];

  // 添加调试信息显示
  return (
    <Card title="学生成绩列表" style={{ maxWidth: 900, margin: '32px auto' }} loading={loading}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <div style={{ marginBottom: 16 }}>
        <p>学生数量: {students.length}</p>
        <p>成绩数量: {grades.length}</p>
      </div>
      <Table
        columns={columns}
        dataSource={students}
        rowKey="StudentID"
        pagination={false}
        locale={{ emptyText: '暂无学生' }}
        size="middle"
      />
      <Modal
        open={addModalOpen}
        title={addStudent ? `为学生 ${addStudent.Name} 添加成绩` : '添加成绩'}
        onCancel={() => { setAddModalOpen(false); addForm.resetFields(); }}
        onOk={handleAddOk}
        destroyOnHidden
      >
        <Form form={addForm} layout="vertical">
          <Form.Item 
            name="score" 
            label="分数" 
            rules={[{ required: true, message: '请输入分数' }]}
          >
            <InputNumber min={0} max={100} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        open={editModalOpen}
        title={editRecord ? `编辑成绩：${editRecord.Name}` : ''}
        onCancel={() => setEditModalOpen(false)}
        onOk={handleEditOk}
      >
        <Form form={form} layout="vertical">
          <Form.Item 
            name="score" 
            label="分数" 
            rules={[{ required: true, message: '请输入分数' }]}
          >
            <InputNumber min={0} max={100} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default GradeList; 