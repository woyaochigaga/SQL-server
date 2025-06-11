import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, message, Popconfirm, Row, Col, Spin, Progress } from 'antd';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

const genderOptions = [
  { value: '男', label: '男' },
  { value: '女', label: '女' },
  { value: '其他', label: '其他' },
];

const ClassDetail = () => {
  const { classId } = useParams();
  const navigate = useNavigate();
  const [classInfo, setClassInfo] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form] = Form.useForm();

  // 获取班级信息和学生列表
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const classRes = await axios.post('http://localhost:3001/api/class-detail', { classId });
        setClassInfo(classRes.data.class || {});
        const stuRes = await axios.post('http://localhost:3001/api/class-students', { classId });
        setStudents(stuRes.data.students || []);
      } catch {
        message.error('加载数据失败');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classId]);

  // 统计男女比例
  const total = students.length;
  const male = students.filter(s => s.Gender === '男').length;
  const female = students.filter(s => s.Gender === '女').length;
  const other = students.filter(s => s.Gender === '其他').length;

  // 新增/编辑学生
  const handleEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue(record || { Gender: '男' });
    setModalOpen(true);
  };
  const handleModalOk = async () => {
    try {
      const values = await form.validateFields();
      if (editRecord) {
        // 修改
        await axios.post('http://localhost:3001/api/update-student', { ...editRecord, ...values });
        message.success('修改成功');
      } else {
        // 新增
        await axios.post('http://localhost:3001/api/add-student', { ...values, ClassID: classId });
        message.success('添加成功');
      }
      setModalOpen(false);
      setEditRecord(null);
      form.resetFields();
      // 刷新学生列表
      const stuRes = await axios.post('http://localhost:3001/api/class-students', { classId });
      setStudents(stuRes.data.students || []);
    } catch {
      message.error('操作失败');
    }
  };
  const handleDelete = async (record) => {
    try {
      await axios.post('http://localhost:3001/api/delete-student', { StudentID: record.StudentID });
      message.success('删除成功');
      // 刷新学生列表
      const stuRes = await axios.post('http://localhost:3001/api/class-students', { classId });
      setStudents(stuRes.data.students || []);
    } catch {
      message.error('删除失败');
    }
  };

  const columns = [
    { title: '学号', dataIndex: 'StudentNumber', key: 'StudentNumber' },
    { title: '姓名', dataIndex: 'Name', key: 'Name' },
    { title: '性别', dataIndex: 'Gender', key: 'Gender' },
    { title: '年龄', dataIndex: 'Age', key: 'Age' },
    { title: '住址', dataIndex: 'Address', key: 'Address' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <>
          <Button size="small" onClick={() => handleEdit(record)} style={{ marginRight: 8 }}>编辑</Button>
          <Popconfirm title="确定删除该学生？" onConfirm={() => handleDelete(record)}><Button size="small" danger>删除</Button></Popconfirm>
        </>
      )
    }
  ];

  return (
    <Card title={classInfo ? `班级详情：${classInfo.ClassName || ''}` : '班级详情'} style={{ maxWidth: 1100, margin: '32px auto' }} loading={loading}>
      <Button onClick={() => navigate(-1)} style={{ marginBottom: 16 }}>返回</Button>
      <Row gutter={32}>
        <Col span={14}>
          <Button type="primary" style={{ marginBottom: 16 }} onClick={() => handleEdit(null)}>新增学生</Button>
          <Table
            columns={columns}
            dataSource={students}
            rowKey="StudentID"
            pagination={false}
            size="middle"
          />
        </Col>
        <Col span={10}>
          <div style={{ height: 360, background: '#fff', borderRadius: 8, boxShadow: '0 2px 8px #f0f1f2', padding: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 16 }}>性别比例</div>
            <div style={{ marginBottom: 8 }}>男：{male} 人</div>
            <Progress percent={total ? Math.round((male / total) * 100) : 0} showInfo format={p => `${p}%`} strokeColor="#1890ff" />
            <div style={{ margin: '16px 0 8px 0' }}>女：{female} 人</div>
            <Progress percent={total ? Math.round((female / total) * 100) : 0} showInfo format={p => `${p}%`} strokeColor="#eb2f96" />
            <div style={{ margin: '16px 0 8px 0' }}>其他：{other} 人</div>
            <Progress percent={total ? Math.round((other / total) * 100) : 0} showInfo format={p => `${p}%`} strokeColor="#faad14" />
          </div>
        </Col>
      </Row>
      <Modal
        open={modalOpen}
        title={editRecord ? '编辑学生' : '新增学生'}
        onCancel={() => { setModalOpen(false); setEditRecord(null); form.resetFields(); }}
        onOk={handleModalOk}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Form.Item name="StudentNumber" label="学号" rules={[{ required: true, message: '请输入学号' }]}> 
            <Input disabled={!!editRecord} />
          </Form.Item>
          <Form.Item name="Name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}> 
            <Input />
          </Form.Item>
        </Form>
      </Modal>
      
    </Card>
  );
};

export default ClassDetail; 