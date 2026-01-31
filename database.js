
// require('dotenv').config(); // Using hardcoded credentials provided by user
const mysql = require('mysql2/promise');
const { complaintsCSV } = require('./data/complaints.csv.ts');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ai_hepdesk2',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const setupDatabase = async () => {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log('Successfully connected to the database.');

        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                major VARCHAR(255),
                departmentName VARCHAR(255)
            );
        `);

        // Create complaints table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS complaints (
                id VARCHAR(255) PRIMARY KEY,
                studentId VARCHAR(255) NOT NULL,
                studentName VARCHAR(255) NOT NULL,
                department VARCHAR(255) NOT NULL,
                complaintText TEXT NOT NULL,
                status VARCHAR(50) NOT NULL,
                priority VARCHAR(50) NOT NULL,
                createdAt DATETIME NOT NULL,
                solutionText TEXT,
                aiRecommendation TEXT,
                FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('Tables created or already exist.');

        // Check if data seeding is needed
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            console.log('No users found. Seeding initial data...');
            await seedData(connection);
        } else {
            console.log('Database already contains data. Skipping seed.');
        }

    } catch (error) {
        console.error('Database setup failed:', error);
        process.exit(1); // Exit if DB setup fails
    } finally {
        if (connection) {
            connection.release();
        }
    }
};

const seedData = async (connection) => {
    // 1. Create Department Users
    const departmentUsers = [
        ['user_dept_asr', 'Dr. Eleanor Vance', 'eleanor@university.edu', 'password', 'department', null, 'Academic Support and Resources'],
        ['user_dept_fs', 'Mr. Benjamin Carter', 'ben@university.edu', 'password', 'department', null, 'Financial Support'],
        ['user_dept_it', 'Ms. Chloe Davis', 'chloe@university.edu', 'password', 'department', null, 'IT'],
        ['user_dept_sa', 'Mr. David Chen', 'david@university.edu', 'password', 'department', null, 'Student Affairs'],
    ];

    // 2. Create student users from CSV data
    const lines = complaintsCSV.trim().split('\n').slice(1);
    const studentIds = [...new Set(lines.map(line => line.split(',')[1].trim()).filter(id => id && id.startsWith('S')))];
    
    const studentUsers = studentIds.map((studentId, index) => ([
        studentId,
        `Student ${studentId.replace('S','')}`,
        index === 0 ? 'student@university.edu' : `student${studentId.replace('S','')}@university.edu`,
        'password',
        'student',
        'Computer Science',
        null
    ]));

    const allUsers = [...departmentUsers, ...studentUsers];
    const userMap = new Map(allUsers.map(u => [u[0], { id: u[0], name: u[1] }]));

    await connection.query('INSERT INTO users (id, name, email, password, role, major, departmentName) VALUES ?', [allUsers]);
    console.log(`${allUsers.length} users seeded.`);

    // 3. Parse CSV and create complaints
    const uniqueComplaints = new Map();
    lines.forEach(line => {
        const parts = line.split(',');
        if (parts.length < 7) return;

        const ticketId = parts[0].trim();
        if (!ticketId || uniqueComplaints.has(ticketId)) return;
        
        const studentId = parts[1].trim();
        const category = parts[2].trim();
        
        const priority = parts[parts.length - 5].trim();
        const status = parts[parts.length - 4].trim();
        const dateSubmitted = parts[parts.length - 3].trim();
        const complaintText = parts.slice(3, parts.length - 5).join(',').replace(/"/g, '').trim();

        if (!studentId || !category || !priority || !status || !dateSubmitted || !complaintText) return;

        const student = userMap.get(studentId);
        if (!student) return;

        let complaintStatus = 'Open';
        if (status === 'Resolved' || status === 'Closed') complaintStatus = 'Closed';
        else if (status === 'Reopened') complaintStatus = 'Reopened';
        else if (status === 'In Progress') complaintStatus = 'Open';

        const dateParts = dateSubmitted.split('/');
        if (dateParts.length !== 3 || !dateParts[2] || !dateParts[0] || !dateParts[1]) return;
        const jsDate = new Date(`${dateParts[2]}-${dateParts[0].padStart(2, '0')}-${dateParts[1].padStart(2, '0')}`);
        const mysqlDateTime = jsDate.toISOString().slice(0, 19).replace('T', ' ');

        const complaint = [
            ticketId,
            studentId,
            student.name,
            category,
            complaintText,
            complaintStatus,
            priority,
            mysqlDateTime,
            complaintStatus === 'Closed' ? 'The issue has been addressed and resolved by our team.' : '',
            'Review the student\'s issue and provide a detailed update or solution.'
        ];
        uniqueComplaints.set(ticketId, complaint);
    });
    
    const complaintsToSeed = Array.from(uniqueComplaints.values());

    if (complaintsToSeed.length > 0) {
        await connection.query('INSERT INTO complaints (id, studentId, studentName, department, complaintText, status, priority, createdAt, solutionText, aiRecommendation) VALUES ?', [complaintsToSeed]);
        console.log(`${complaintsToSeed.length} complaints seeded.`);
    }
};

module.exports = { pool, setupDatabase };