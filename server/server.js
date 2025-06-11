require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 数据库配置
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  server: process.env.DB_HOST,
  database: process.env.DB_NAME,
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

// 连接数据库
async function connectDB() {
  try {
    console.log('Attempting to connect with config:', {
      user: dbConfig.user,
      server: dbConfig.server,
      database: dbConfig.database,
      options: dbConfig.options
    });
    await sql.connect(dbConfig);
    console.log('Connected to SQL Server database');
    
    // 检查数据库连接
    const result = await sql.query`SELECT 'Database connection successful' AS message`;
    console.log(result.recordset[0].message);
  } catch (err) {
    console.error('Database connection error:', err);
    console.error('Error details:', err.message);
    if (err.originalError) {
      console.error('Original error:', err.originalError);
    }
  }
}

// JWT密钥
const JWT_SECRET = process.env.JWT_SECRET;

console.log('JWT_SECRET:', process.env.JWT_SECRET);

// 登录API
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码不能为空' });
    }
    
    // 查询用户
    const result = await sql.query`
      SELECT UserID, Username, Password, Role, Email, Phone 
      FROM Users 
      WHERE Username = ${username}
    `;
    
    const user = result.recordset[0];
    
    if (!user) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }
    
    // 验证密码
    let isPasswordValid = false;
    
    // 如果是MD5加密的密码（数据库中的初始密码）
    if (user.Password.length === 32) {
      // 直接比较MD5值（仅用于初始密码）
      const md5Password = require('crypto').createHash('md5').update(password).digest('hex');
      isPasswordValid = md5Password === user.Password;
    } else {
      // 使用bcrypt比较密码（用于后续更改的密码）
      isPasswordValid = await bcrypt.compare(password, user.Password);
    }
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: '用户名或密码不正确' });
    }
    
    // 更新最后登录时间
    await sql.query`
      UPDATE Users 
      SET LastLogin = GETDATE() 
      WHERE UserID = ${user.UserID}
    `;
    
    // 查询详细信息
    let detailInfo = null;
    if (user.Role === 'student') {
      const detailRes = await sql.query`
        SELECT * FROM Students WHERE UserID = ${user.UserID}
      `;
      detailInfo = detailRes.recordset[0] || null;
    } else if (user.Role === 'teacher') {
      const detailRes = await sql.query`
        SELECT * FROM Teachers WHERE UserID = ${user.UserID}
      `;
      detailInfo = detailRes.recordset[0] || null;
    }
    
    // 创建JWT令牌
    const token = jwt.sign(
      { id: user.UserID, username: user.Username, role: user.Role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // 返回用户信息和令牌
    res.json({
      token,
      user: {
        id: user.UserID,
        username: user.Username,
        role: user.Role,
        email: user.Email,
        phone: user.Phone,
        detailInfo
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 中间件：验证JWT令牌
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: '无效的令牌' });
    }
    req.user = user;
    next();
  });
}

// 获取学生列表API
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    const result = await sql.query`
      SELECT s.StudentID, s.StudentNumber, s.Name, s.Gender, s.Age, 
             c.ClassName, s.Address
      FROM Students s
      LEFT JOIN Classes c ON s.ClassID = c.ClassID
      ORDER BY s.StudentID
    `;
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching students:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取课程列表API
app.get('/api/courses', authenticateToken, async (req, res) => {
  try {
    const result = await sql.query`
      SELECT c.CourseID, c.CourseCode, c.CourseName, c.Credits, 
             t.Name AS TeacherName, c.Semester, c.Description
      FROM Courses c
      LEFT JOIN Teachers t ON c.TeacherID = t.TeacherID
      ORDER BY c.CourseID
    `;
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching courses:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取成绩列表API
app.get('/api/grades', authenticateToken, async (req, res) => {
  try {
    const result = await sql.query`
      SELECT g.GradeID, s.StudentNumber, s.Name AS StudentName, 
             c.CourseCode, c.CourseName, g.Score, g.GradeDate
      FROM Grades g
      JOIN Students s ON g.StudentID = s.StudentID
      JOIN Courses c ON g.CourseID = c.CourseID
      ORDER BY g.GradeID
    `;
    
    res.json(result.recordset);
  } catch (err) {
    console.error('Error fetching grades:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 获取统计数据API
app.get('/api/statistics', authenticateToken, async (req, res) => {
  try {
    // 获取学生总数
    const studentsResult = await sql.query`SELECT COUNT(*) AS StudentCount FROM Students`;
    
    // 获取课程总数
    const coursesResult = await sql.query`SELECT COUNT(*) AS CourseCount FROM Courses`;
    
    // 获取平均成绩
    const avgScoreResult = await sql.query`SELECT AVG(Score) AS AvgScore FROM Grades`;
    
    // 获取成绩分布
    const scoreDistributionResult = await sql.query`
      SELECT 
        COUNT(CASE WHEN Score >= 90 THEN 1 END) AS A,
        COUNT(CASE WHEN Score >= 80 AND Score < 90 THEN 1 END) AS B,
        COUNT(CASE WHEN Score >= 70 AND Score < 80 THEN 1 END) AS C,
        COUNT(CASE WHEN Score >= 60 AND Score < 70 THEN 1 END) AS D,
        COUNT(CASE WHEN Score < 60 THEN 1 END) AS F
      FROM Grades
    `;
    
    res.json({
      studentCount: studentsResult.recordset[0].StudentCount,
      courseCount: coursesResult.recordset[0].CourseCount,
      averageScore: avgScoreResult.recordset[0].AvgScore || 0,
      scoreDistribution: scoreDistributionResult.recordset[0]
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

// 用户注册API
app.post('/api/register', async (req, res) => {
  console.log('收到注册请求:', JSON.stringify(req.body));
  try {
    const { username, password, email, phone, role } = req.body;
    
    // 验证必填字段
    if (!username || !password) {
      console.log('注册失败: 缺少必填字段 username或password');
      return res.status(400).json({ message: '用户名和密码是必填的' });
    }

    if (!email) {
      console.log('注册失败: 缺少必填字段 email');
      return res.status(400).json({ message: '邮箱是必填的' });
    }

    if (!role) {
      console.log('注册失败: 缺少必填字段 role');
      return res.status(400).json({ message: '用户角色是必填的' });
    }
    
    // 检查用户名是否已存在
    console.log('检查用户名是否存在:', username);
    const userCheck = await sql.query`
      SELECT Username FROM Users WHERE Username = ${username}
    `;
    
    if (userCheck.recordset.length > 0) {
      console.log('注册失败: 用户名已存在');
      return res.status(400).json({ message: '用户名已存在' });
    }
    
    // 检查邮箱是否已存在
    console.log('检查邮箱是否存在:', email);
    const emailCheck = await sql.query`
      SELECT Email FROM Users WHERE Email = ${email}
    `;
    
    if (emailCheck.recordset.length > 0) {
      console.log('注册失败: 邮箱已被注册');
      return res.status(400).json({ message: '邮箱已被注册' });
    }
    
    // 验证角色
    console.log('验证角色:', role);
    if (role !== 'student' && role !== 'teacher' && role !== 'admin') {
      console.log('注册失败: 无效的用户角色', role);
      return res.status(400).json({ message: '无效的用户角色，必须是student、teacher或admin' });
    }
    
    // 哈希密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // 创建用户
    console.log('创建新用户:', { username, email, phone, role });
    // 插入用户记录并获取新UserID（合并为一条SQL语句）
    const result = await sql.query(`
      INSERT INTO Users (Username, Password, Email, Phone, Role, CreatedAt)
      VALUES ('${username}', '${hashedPassword}', '${email}', '${phone || ''}', '${role}', GETDATE());
      SELECT SCOPE_IDENTITY() AS UserID;
    `);
    const newUserID = result.recordset[0].UserID;
    console.log('新用户ID:', newUserID);
    // 根据角色插入到对应表
    if (role === 'student') {
      const studentNumber = 'S' + String(newUserID).padStart(6, '0');
      await sql.query`
        INSERT INTO Students (StudentNumber, Name, Gender, Age, ClassID, Address, UserID, CreatedAt)
        VALUES (${studentNumber}, ${username}, NULL, NULL, NULL, NULL, ${newUserID}, GETDATE())
      `;
      console.log('已插入Students表:', studentNumber);
    } else if (role === 'teacher') {
      const teacherNumber = 'T' + String(newUserID).padStart(6, '0');
      await sql.query`
        INSERT INTO Teachers (TeacherNumber, Name, Gender, Title, Department, UserID, CreatedAt)
        VALUES (${teacherNumber}, ${username}, NULL, NULL, NULL, ${newUserID}, GETDATE())
      `;
      console.log('已插入Teachers表:', teacherNumber);
    }
    
    console.log('注册成功:', username);
    res.status(201).json({ message: '注册成功' });
  } catch (err) {
    console.error('注册错误详情:', err);
    console.error('错误堆栈:', err.stack);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 请求重置密码API
app.post('/api/reset-password-request', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    // 验证用户名和邮箱
    if (!username || !email) {
      return res.status(400).json({ message: '用户名和邮箱不能为空' });
    }
    
    // 查找用户
    const result = await sql.query`
      SELECT UserID, Email FROM Users 
      WHERE Username = ${username} AND Email = ${email}
    `;
    
    if (result.recordset.length === 0) {
      // 为了安全，不告诉用户具体是用户名还是邮箱不匹配
      return res.status(200).json({ message: '如果用户存在，重置密码的邮件已发送' });
    }
    
    const user = result.recordset[0];
    
    // 生成重置令牌
    const resetToken = require('crypto').randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // 1小时有效期
    
    // 保存重置令牌
    await sql.query`
      UPDATE Users 
      SET ResetToken = ${resetToken}, ResetTokenExpiry = ${resetTokenExpiry}
      WHERE UserID = ${user.UserID}
    `;
    
    // TODO: 发送重置密码邮件
    // 在实际应用中，这里应该发送包含重置链接的邮件
    console.log(`重置密码链接: http://localhost:3000/reset-password?token=${resetToken}`);
    
    res.status(200).json({ message: '重置密码邮件已发送' });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 重置密码API
app.post('/api/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    // 验证令牌和新密码
    if (!token || !newPassword) {
      return res.status(400).json({ message: '令牌和新密码不能为空' });
    }
    
    // 查找有效的重置令牌
    const result = await sql.query`
      SELECT UserID FROM Users 
      WHERE ResetToken = ${token} AND ResetTokenExpiry > GETDATE()
    `;
    
    if (result.recordset.length === 0) {
      return res.status(400).json({ message: '无效或已过期的重置令牌' });
    }
    
    const user = result.recordset[0];
    
    // 哈希新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // 更新密码并清除重置令牌
    await sql.query`
      UPDATE Users 
      SET Password = ${hashedPassword}, ResetToken = NULL, ResetTokenExpiry = NULL
      WHERE UserID = ${user.UserID}
    `;
    
    res.status(200).json({ message: '密码重置成功' });
  } catch (err) {
    console.error('Password reset error:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 更新个人信息接口
app.post('/api/update-profile', async (req, res) => {
  try {
    const { userId, role, ...fields } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ message: '缺少用户ID或角色' });
    }
    // 1. 更新Users表（通用字段）
    const userFields = {};
    if (fields.Email !== undefined) userFields.Email = fields.Email;
    if (fields.Phone !== undefined) userFields.Phone = fields.Phone;
    if (Object.keys(userFields).length > 0) {
      let setStr = Object.keys(userFields).map(f => `${f} = @${f}`).join(', ');
      const userRequest = new sql.Request();
      Object.entries(userFields).forEach(([k, v]) => userRequest.input(k, v));
      userRequest.input('UserID', userId);
      await userRequest.query(`UPDATE Users SET ${setStr} WHERE UserID = @UserID`);
    }
    // 2. 更新Students/Teachers表（专属字段）
    if (role === 'student') {
      const stuFields = {};
      if (fields.Gender !== undefined) stuFields.Gender = fields.Gender;
      if (fields.Age !== undefined) stuFields.Age = fields.Age;
      if (fields.ClassID !== undefined) stuFields.ClassID = fields.ClassID;
      if (fields.Address !== undefined) stuFields.Address = fields.Address;
      if (Object.keys(stuFields).length > 0) {
        let setStr = Object.keys(stuFields).map(f => `${f} = @${f}`).join(', ');
        const stuRequest = new sql.Request();
        Object.entries(stuFields).forEach(([k, v]) => stuRequest.input(k, v));
        stuRequest.input('UserID', userId);
        await stuRequest.query(`UPDATE Students SET ${setStr} WHERE UserID = @UserID`);
      }
      // 查询最新详细信息
      const detailRes = await sql.query`SELECT * FROM Students WHERE UserID = ${userId}`;
      const userRes = await sql.query`SELECT * FROM Users WHERE UserID = ${userId}`;
      return res.json({ detailInfo: detailRes.recordset[0], userInfo: userRes.recordset[0] });
    } else if (role === 'teacher') {
      const teaFields = {};
      if (fields.Gender !== undefined) teaFields.Gender = fields.Gender;
      if (fields.Title !== undefined) teaFields.Title = fields.Title;
      if (fields.Department !== undefined) teaFields.Department = fields.Department;
      if (Object.keys(teaFields).length > 0) {
        let setStr = Object.keys(teaFields).map(f => `${f} = @${f}`).join(', ');
        const teaRequest = new sql.Request();
        Object.entries(teaFields).forEach(([k, v]) => teaRequest.input(k, v));
        teaRequest.input('UserID', userId);
        await teaRequest.query(`UPDATE Teachers SET ${setStr} WHERE UserID = @UserID`);
      }
      // 查询最新详细信息
      const detailRes = await sql.query`SELECT * FROM Teachers WHERE UserID = ${userId}`;
      const userRes = await sql.query`SELECT * FROM Users WHERE UserID = ${userId}`;
      return res.json({ detailInfo: detailRes.recordset[0], userInfo: userRes.recordset[0] });
    } else {
      return res.status(400).json({ message: '不支持的角色' });
    }
  } catch (err) {
    console.error('更新个人信息错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 1. 通过教师ID查课程
app.post('/api/teacher-courses', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ message: '缺少teacherId' });
    const result = await sql.query`SELECT * FROM Courses WHERE TeacherID = ${teacherId}`;
    res.json({ courses: result.recordset });
  } catch (err) {
    console.error('查询教师课程错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 2. 通过课程ID查该课程所有选课学生
app.post('/api/course-students', async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: '缺少courseId' });
    // 先查StudentCourses表，找出所有选了该课程的StudentID
    const scRes = await sql.query`SELECT StudentID FROM StudentCourses WHERE CourseID = ${courseId}`;
    const studentIds = scRes.recordset.map(row => row.StudentID);
    if (!studentIds.length) return res.json({ students: [] });
    // 再查Students表，返回所有学生字段
    const stuRes = await sql.query(`SELECT * FROM Students WHERE StudentID IN (${studentIds.join(',')})`);
    res.json({ students: stuRes.recordset });
  } catch (err) {
    console.error('查询课程学生错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 3. 通过课程ID查课程详情
app.post('/api/course-detail', async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: '缺少courseId' });
    // 查询课程详情，联表查教师姓名
    const result = await sql.query`
      SELECT c.CourseID, c.CourseCode, c.CourseName, c.Credits, c.Semester, c.Description, c.TeacherID, t.Name AS TeacherName
      FROM Courses c
      LEFT JOIN Teachers t ON c.TeacherID = t.TeacherID
      WHERE c.CourseID = ${courseId}
    `;
    if (!result.recordset.length) return res.status(404).json({ message: '未找到该课程' });
    res.json({ course: result.recordset[0] });
  } catch (err) {
    console.error('查询课程详情错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 通过教师ID查班级
app.post('/api/teacher-classes', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ message: '缺少teacherId' });
    // 查询 advisor 字段等于 teacherId 的所有班级
    const result = await sql.query`SELECT * FROM Classes WHERE advisor = ${teacherId}`;
    res.json({ classes: result.recordset });
  } catch (err) {
    console.error('查询教师班级错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 通过班级ID查该班级所有学生
app.post('/api/class-students', async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ message: '缺少classId' });
    // 查询该班级所有学生
    const result = await sql.query`SELECT * FROM Students WHERE ClassID = ${classId}`;
    res.json({ students: result.recordset });
  } catch (err) {
    console.error('查询班级学生错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 加入学生到班级（更新ClassID）
app.post('/api/add-student', async (req, res) => {
  try {
    const { StudentID, StudentNumber, ClassID } = req.body;
    if ((!StudentID && !StudentNumber) || !ClassID) {
      return res.status(400).json({ message: '缺少学生ID/学号或班级ID' });
    }
    if (StudentID) {
      await sql.query`UPDATE Students SET ClassID = ${ClassID} WHERE StudentID = ${StudentID}`;
    } else {
      await sql.query`UPDATE Students SET ClassID = ${ClassID} WHERE StudentNumber = ${StudentNumber}`;
    }
    res.json({ message: '学生已加入班级' });
  } catch (err) {
    console.error('加入班级错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 从班级移除学生（ClassID置为NULL）
app.post('/api/delete-student', async (req, res) => {
  try {
    const { StudentID, StudentNumber } = req.body;
    if (!StudentID && !StudentNumber) {
      return res.status(400).json({ message: '缺少学生ID/学号' });
    }
    if (StudentID) {
      await sql.query`UPDATE Students SET ClassID = NULL WHERE StudentID = ${StudentID}`;
    } else {
      await sql.query`UPDATE Students SET ClassID = NULL WHERE StudentNumber = ${StudentNumber}`;
    }
    res.json({ message: '学生已移出班级' });
  } catch (err) {
    console.error('移出班级错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 查询班级详情
app.post('/api/class-detail', async (req, res) => {
  try {
    const { classId } = req.body;
    if (!classId) return res.status(400).json({ message: '缺少classId' });
    const result = await sql.query`SELECT * FROM Classes WHERE ClassID = ${classId}`;
    if (!result.recordset.length) return res.status(404).json({ message: '未找到该班级' });
    res.json({ class: result.recordset[0] });
  } catch (err) {
    console.error('查询班级详情错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 新增成绩
app.post('/api/add-grade', async (req, res) => {
  try {
    const { studentId, courseId, score, comments, createdBy } = req.body;
    if (!studentId || !courseId || score === undefined) {
      return res.status(400).json({ message: '参数不完整' });
    }
    // 检查是否已存在成绩
    const exist = await sql.query`SELECT * FROM Grades WHERE StudentID = ${studentId} AND CourseID = ${courseId}`;
    if (exist.recordset.length > 0) {
      return res.status(400).json({ message: '该学生成绩已存在' });
    }
    await sql.query`
      INSERT INTO Grades (StudentID, CourseID, Score, GradeDate, Comments, CreatedBy)
      VALUES (
        ${studentId},
        ${courseId},
        ${score},
        GETDATE(),
        ${comments || null},
        ${createdBy || null}
      )
    `;
    res.json({ message: '成绩添加成功' });
  } catch (err) {
    console.error('添加成绩错误:', err);
    res.status(500).json({ message: err.message || '服务器错误，请稍后再试' });
  }
});

// 删除成绩
app.post('/api/delete-grade', async (req, res) => {
  try {
    const { gradeId } = req.body;
    if (!gradeId) {
      return res.status(400).json({ message: '缺少成绩ID' });
    }
    await sql.query`DELETE FROM Grades WHERE GradeID = ${gradeId}`;
    res.json({ message: '成绩已删除' });
  } catch (err) {
    console.error('删除成绩错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 修改成绩
app.post('/api/update-grade', async (req, res) => {
  try {
    const { gradeId, score } = req.body;
    if (!gradeId || score === undefined) {
      return res.status(400).json({ message: '缺少成绩ID或分数' });
    }
    await sql.query`UPDATE Grades SET Score = ${score}, GradeDate = GETDATE() WHERE GradeID = ${gradeId}`;
    res.json({ message: '成绩已更新' });
  } catch (err) {
    console.error('修改成绩错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 学生首页仪表盘接口
app.get('/api/student-dashboard', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: '缺少studentId' });

    // 1. 查询学业概况
    const gpaRes = await sql.query`
      SELECT 
        SUM(CASE WHEN g.Score >= 60 THEN c.Credits ELSE 0 END) AS PassedCredits,
        COUNT(CASE WHEN g.Score < 60 THEN 1 END) AS FailedCount,
        ROUND(
          CASE WHEN SUM(c.Credits) > 0 THEN 
            SUM(
              c.Credits * 
              CASE 
                WHEN g.Score >= 90 THEN 4.0
                WHEN g.Score >= 80 THEN 3.0
                WHEN g.Score >= 70 THEN 2.0
                WHEN g.Score >= 60 THEN 1.0
                ELSE 0.0
              END
            ) / SUM(c.Credits)
          ELSE 0 END, 2
        ) AS GPA
      FROM Grades g
      JOIN Courses c ON g.CourseID = c.CourseID
      WHERE g.StudentID = ${studentId}
    `;
    const gpaInfo = gpaRes.recordset[0] || { GPA: 0, PassedCredits: 0, FailedCount: 0 };

    // 2. 查询学生、班级、班主任信息
    const stuRes = await sql.query`
      SELECT s.Name AS StudentName, s.StudentNumber, s.ClassID, c.ClassName, c.Department, 
             t.Name AS TeacherName, u.Email AS TeacherEmail, u.Phone AS TeacherPhone, t.Title AS TeacherTitle
      FROM Students s
      LEFT JOIN Classes c ON s.ClassID = c.ClassID
      LEFT JOIN Teachers t ON c.Advisor = t.TeacherID
      LEFT JOIN Users u ON t.UserID = u.UserID
      WHERE s.StudentID = ${studentId}
    `;
    const stuInfo = stuRes.recordset[0] || {};

    res.json({
      gpa: gpaInfo.GPA || 0,
      passedCredits: gpaInfo.PassedCredits || 0,
      failedCount: gpaInfo.FailedCount || 0,
      className: stuInfo.ClassName || '',
      department: stuInfo.Department || '',
      teacherName: stuInfo.TeacherName || '',
      teacherEmail: stuInfo.TeacherEmail || '',
      teacherPhone: stuInfo.TeacherPhone || '',
      teacherTitle: stuInfo.TeacherTitle || '',
    });
  } catch (err) {
    console.error('学生首页仪表盘接口错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取学生所有课程及成绩
app.get('/api/student-courses', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: '缺少studentId' });
    const result = await sql.query`
      SELECT c.CourseID, c.CourseName, c.CourseCode, t.Name AS TeacherName, 
             g.Score, g.GradeID, g.GradeDate
      FROM StudentCourses sc
      JOIN Courses c ON sc.CourseID = c.CourseID
      LEFT JOIN Teachers t ON c.TeacherID = t.TeacherID
      LEFT JOIN Grades g ON g.StudentID = sc.StudentID AND g.CourseID = sc.CourseID
      WHERE sc.StudentID = ${studentId}
    `;
    res.json({ courses: result.recordset });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 发布课程活动（如签到、考试、通知选课等）
app.post('/api/course-activity', async (req, res) => {
  try {
    const { courseId, activityType, activityDate, comments, recordedBy } = req.body;
    if (!courseId || !activityType || !activityDate || !recordedBy) {
      return res.status(400).json({ message: '参数不完整' });
    }
    // 查询该课程所有学生
    const stuRes = await sql.query`SELECT StudentID FROM StudentCourses WHERE CourseID = ${courseId}`;
    const students = stuRes.recordset;
    if (!students.length) return res.status(400).json({ message: '该课程暂无学生' });

    // 批量插入活动记录
    for (const stu of students) {
      await sql.query`
        INSERT INTO Attendance (StudentID, CourseID, AttendanceDate, Status, Comments, RecordedBy)
        VALUES (${stu.StudentID}, ${courseId}, ${activityDate}, ${activityType}, ${comments || null}, ${recordedBy})
      `;
    }
    res.json({ message: '活动已发布' });
  } catch (err) {
    console.error('发布课程活动错误:', err);
    res.status(500).json({ message: '服务器错误，请稍后再试' });
  }
});

// 获取学生所有课程的活动（考勤表中的活动）
app.get('/api/student-activities', async (req, res) => {
  try {
    const { studentId } = req.query;
    if (!studentId) return res.status(400).json({ message: '缺少studentId' });
    const result = await sql.query`
      SELECT c.CourseID, c.CourseName, c.CourseCode, t.Name AS TeacherName,
             a.AttendanceID, a.AttendanceDate, a.Status, a.Comments
      FROM Attendance a
      JOIN Courses c ON a.CourseID = c.CourseID
      LEFT JOIN Teachers t ON c.TeacherID = t.TeacherID
      WHERE a.StudentID = ${studentId}
      ORDER BY a.AttendanceDate DESC
    `;
    res.json({ activities: result.recordset });
  } catch (err) {
    res.status(500).json({ message: '服务器错误' });
  }
});

// 启动服务器
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    
    // 打印所有可用的API路由
    console.log('可用的API路由:');
    app._router.stack.forEach((middleware) => {
      if (middleware.route) {
        // 直接路由
        const path = middleware.route.path;
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        console.log(`${methods} ${path}`);
      } else if (middleware.name === 'router') {
        // 路由器中间件
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const path = handler.route.path;
            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
            console.log(`${methods} ${path}`);
          }
        });
      }
    });
  });
}); 