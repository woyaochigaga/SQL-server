-- 创建数据库
CREATE DATABASE StudentManagementSystem;
GO

USE StudentManagementSystem;
GO

-- 用户表
CREATE TABLE Users (
    UserID INT PRIMARY KEY IDENTITY(1,1),
    Username NVARCHAR(50) NOT NULL UNIQUE,
    Password NVARCHAR(100) NOT NULL,
    Role NVARCHAR(20) NOT NULL CHECK (Role IN ('admin', 'teacher', 'student')),
    Email NVARCHAR(100),
    Phone NVARCHAR(20),
    CreatedAt DATETIME DEFAULT GETDATE(),
    LastLogin DATETIME NULL
);
GO

-- 班级表
CREATE TABLE Classes (
    ClassID INT PRIMARY KEY IDENTITY(1,1),
    ClassName NVARCHAR(50) NOT NULL UNIQUE,
    Department NVARCHAR(50),
    GradeYear INT,
    Advisor NVARCHAR(50),
    CreatedAt DATETIME DEFAULT GETDATE()
);
GO

-- 学生表
CREATE TABLE Students (
    StudentID INT PRIMARY KEY IDENTITY(1,1),
    StudentNumber NVARCHAR(20) NOT NULL UNIQUE,
    Name NVARCHAR(50) NOT NULL,
    Gender NVARCHAR(10) CHECK (Gender IN ('男', '女', '其他')),
    Age INT CHECK (Age > 0 AND Age < 100),
    ClassID INT,
    Address NVARCHAR(200),
    UserID INT UNIQUE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (ClassID) REFERENCES Classes(ClassID),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- 教师表
CREATE TABLE Teachers (
    TeacherID INT PRIMARY KEY IDENTITY(1,1),
    TeacherNumber NVARCHAR(20) NOT NULL UNIQUE,
    Name NVARCHAR(50) NOT NULL,
    Gender NVARCHAR(10) CHECK (Gender IN ('男', '女', '其他')),
    Title NVARCHAR(50),
    Department NVARCHAR(50),
    UserID INT UNIQUE,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- 课程表
CREATE TABLE Courses (
    CourseID INT PRIMARY KEY IDENTITY(1,1),
    CourseCode NVARCHAR(20) NOT NULL UNIQUE,
    CourseName NVARCHAR(100) NOT NULL,
    Credits DECIMAL(3,1) NOT NULL CHECK (Credits > 0),
    Description NVARCHAR(500),
    TeacherID INT,
    Semester NVARCHAR(20),
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (TeacherID) REFERENCES Teachers(TeacherID)
);
GO

-- 学生选课表
CREATE TABLE StudentCourses (
    StudentCourseID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL,
    CourseID INT NOT NULL,
    EnrollDate DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),
    CONSTRAINT UC_StudentCourse UNIQUE (StudentID, CourseID)
);
GO

-- 成绩表
CREATE TABLE Grades (
    GradeID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL,
    CourseID INT NOT NULL,
    Score DECIMAL(5,2) NOT NULL CHECK (Score >= 0 AND Score <= 100),
    GradeDate DATE NOT NULL,
    Comments NVARCHAR(500),
    CreatedBy INT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),
    FOREIGN KEY (CreatedBy) REFERENCES Users(UserID),
    CONSTRAINT UC_StudentCourseGrade UNIQUE (StudentID, CourseID)
);
GO

-- 考勤表
CREATE TABLE Attendance (
    AttendanceID INT PRIMARY KEY IDENTITY(1,1),
    StudentID INT NOT NULL,
    CourseID INT NOT NULL,
    AttendanceDate DATE NOT NULL,
    Status NVARCHAR(20) CHECK (Status IN ('出席', '迟到', '早退', '缺席', '请假')),
    Comments NVARCHAR(200),
    RecordedBy INT,
    CreatedAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (StudentID) REFERENCES Students(StudentID),
    FOREIGN KEY (CourseID) REFERENCES Courses(CourseID),
    FOREIGN KEY (RecordedBy) REFERENCES Users(UserID),
    CONSTRAINT UC_StudentCourseAttendance UNIQUE (StudentID, CourseID, AttendanceDate)
);
GO

-- 系统日志表
CREATE TABLE SystemLogs (
    LogID INT PRIMARY KEY IDENTITY(1,1),
    UserID INT,
    Action NVARCHAR(100) NOT NULL,
    Description NVARCHAR(500),
    IPAddress NVARCHAR(50),
    LogTime DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

-- 创建初始管理员账户
INSERT INTO Users (Username, Password, Role, Email)
VALUES ('admin', 'e10adc3949ba59abbe56e057f20f883e', 'admin', 'admin@example.com'); -- 密码: 123456 (MD5加密)
GO

-- 创建示例班级
INSERT INTO Classes (ClassName, Department, GradeYear)
VALUES 
('计算机科学与技术1班', '计算机科学与工程学院', 2023),
('软件工程2班', '计算机科学与工程学院', 2023),
('数据科学1班', '数学与统计学院', 2023);
GO

-- 创建示例教师账户和信息
INSERT INTO Users (Username, Password, Role, Email)
VALUES 
('teacher1', 'e10adc3949ba59abbe56e057f20f883e', 'teacher', 'teacher1@example.com'),
('teacher2', 'e10adc3949ba59abbe56e057f20f883e', 'teacher', 'teacher2@example.com');
GO

INSERT INTO Teachers (TeacherNumber, Name, Gender, Title, Department, UserID)
VALUES 
('T20230001', '李教授', '男', '教授', '计算机科学与工程学院', 2),
('T20230002', '王副教授', '女', '副教授', '数学与统计学院', 3);
GO

-- 创建示例课程
INSERT INTO Courses (CourseCode, CourseName, Credits, Description, TeacherID, Semester)
VALUES 
('CS101', '计算机导论', 3.0, '计算机科学基础课程', 1, '2023-2024-1'),
('CS201', '数据结构', 4.0, '介绍基本数据结构和算法', 1, '2023-2024-1'),
('MATH101', '高等数学', 5.0, '微积分和线性代数基础', 2, '2023-2024-1');
GO

-- 创建视图：学生成绩视图
CREATE VIEW vw_StudentGrades AS
SELECT 
    s.StudentID,
    s.StudentNumber,
    s.Name AS StudentName,
    c.ClassID,
    c.ClassName,
    co.CourseID,
    co.CourseCode,
    co.CourseName,
    co.Credits,
    t.Name AS TeacherName,
    g.Score,
    g.GradeDate
FROM 
    Students s
    INNER JOIN Grades g ON s.StudentID = g.StudentID
    INNER JOIN Courses co ON g.CourseID = co.CourseID
    INNER JOIN Classes c ON s.ClassID = c.ClassID
    INNER JOIN Teachers t ON co.TeacherID = t.TeacherID;
GO

-- 创建存储过程：获取学生成绩单
CREATE PROCEDURE sp_GetStudentTranscript
    @StudentID INT
AS
BEGIN
    SELECT 
        s.StudentNumber,
        s.Name AS StudentName,
        c.ClassName,
        co.CourseCode,
        co.CourseName,
        co.Credits,
        g.Score,
        CASE 
            WHEN g.Score >= 90 THEN 'A'
            WHEN g.Score >= 80 THEN 'B'
            WHEN g.Score >= 70 THEN 'C'
            WHEN g.Score >= 60 THEN 'D'
            ELSE 'F'
        END AS GradeLevel
    FROM 
        Students s
        INNER JOIN Grades g ON s.StudentID = g.StudentID
        INNER JOIN Courses co ON g.CourseID = co.CourseID
        INNER JOIN Classes c ON s.ClassID = c.ClassID
    WHERE 
        s.StudentID = @StudentID
    ORDER BY 
        co.CourseCode;
END;
GO

-- 创建存储过程：计算学生GPA
CREATE PROCEDURE sp_CalculateStudentGPA
    @StudentID INT
AS
BEGIN
    DECLARE @TotalCredits DECIMAL(5,1) = 0;
    DECLARE @TotalPoints DECIMAL(10,2) = 0;
    
    SELECT 
        @TotalCredits = SUM(co.Credits),
        @TotalPoints = SUM(co.Credits * 
            CASE 
                WHEN g.Score >= 90 THEN 4.0
                WHEN g.Score >= 80 THEN 3.0
                WHEN g.Score >= 70 THEN 2.0
                WHEN g.Score >= 60 THEN 1.0
                ELSE 0.0
            END)
    FROM 
        Grades g
        INNER JOIN Courses co ON g.CourseID = co.CourseID
    WHERE 
        g.StudentID = @StudentID;
    
    SELECT 
        s.StudentNumber,
        s.Name,
        c.ClassName,
        @TotalCredits AS TotalCredits,
        CASE 
            WHEN @TotalCredits > 0 THEN ROUND(@TotalPoints / @TotalCredits, 2)
            ELSE 0
        END AS GPA
    FROM 
        Students s
        LEFT JOIN Classes c ON s.ClassID = c.ClassID
    WHERE 
        s.StudentID = @StudentID;
END;
GO

-- 创建触发器：记录成绩变更
CREATE TRIGGER trg_GradeChanges
ON Grades
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    DECLARE @Action NVARCHAR(10);
    
    IF EXISTS (SELECT * FROM inserted) AND EXISTS (SELECT * FROM deleted)
        SET @Action = 'UPDATE';
    ELSE IF EXISTS (SELECT * FROM inserted)
        SET @Action = 'INSERT';
    ELSE
        SET @Action = 'DELETE';
    
    IF @Action = 'INSERT' OR @Action = 'UPDATE'
    BEGIN
        INSERT INTO SystemLogs (UserID, Action, Description)
        SELECT 
            i.CreatedBy,
            'Grade ' + @Action,
            'Changed grade for StudentID: ' + CAST(i.StudentID AS NVARCHAR) + 
            ', CourseID: ' + CAST(i.CourseID AS NVARCHAR) + 
            ', Score: ' + CAST(i.Score AS NVARCHAR)
        FROM 
            inserted i;
    END
    ELSE
    BEGIN
        INSERT INTO SystemLogs (UserID, Action, Description)
        SELECT 
            NULL,
            'Grade DELETE',
            'Deleted grade for StudentID: ' + CAST(d.StudentID AS NVARCHAR) + 
            ', CourseID: ' + CAST(d.CourseID AS NVARCHAR)
        FROM 
            deleted d;
    END
END;
GO 