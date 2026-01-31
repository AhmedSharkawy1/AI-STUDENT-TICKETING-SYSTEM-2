require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { complaintsCSV } = require('./data/complaintsData.js');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_helpdesk2',
    port: process.env.DB_PORT || 3306,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: false
    } : undefined
};

let pool;

const getPool = () => {
    if (!pool) {
        pool = mysql.createPool(dbConfig);
    }
    return pool;
}

const setupDatabase = async () => {
    let connection;
    try {
        // If connecting to localhost, we attempt to create the DB.
        if (dbConfig.host === 'localhost') {
             const tempConnection = await mysql.createConnection({
                host: dbConfig.host,
                user: dbConfig.user,
                password: dbConfig.password,
                charset: dbConfig.charset,
            });
            await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
            await tempConnection.end();
        }

        const pool = getPool();
        connection = await pool.getConnection();
        console.log('Successfully connected to the database pool.');

        // Create users table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(255) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL,
                major VARCHAR(255),
                departmentName VARCHAR(255),
                age INT NULL
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
                resolvedAt DATETIME NULL,
                solutionText TEXT,
                aiRecommendation TEXT,
                FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
            );
        `);
        console.log('Tables checked/created.');

        // Seeding Logic
        const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
        if (rows[0].count === 0) {
            console.log('No users found. Seeding initial data...');
            await seedData(connection);
        }
        
    } catch (error) {
        console.error('Database setup failed:', error);
    } finally {
        if (connection) connection.release();
    }
};

const robustCSVParser = (csvString) => {
    if (!csvString) return [];
    const lines = csvString.trim().split('\n');
    const records = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        const parts = line.split(',');
        if (parts.length < 7) continue;

        const record = {};
        record.Ticket_ID = parts[0].trim();
        record.Student_ID = parts[1].trim();
        record.Category = parts[2].trim();
        record.Date_Submitted = parts[parts.length - 3].trim();
        record.Status = parts[parts.length - 4].trim();
        record.Priority = parts[parts.length - 5].trim();
        record.Complaint_Text = parts.slice(3, parts.length - 5).join(',').replace(/"/g, '').trim();

        records.push(record);
    }
    return records;
};


const seedData = async (connection) => {
    try {
        const hashedPassword = await bcrypt.hash('password', 10);
        
        const departmentUsers = [
            ['user_dept_asr', 'Dr. Eleanor Vance', 'eleanor@university.edu', hashedPassword, 'department', null, 'Academic Support and Resources', 45],
            ['user_dept_fs', 'Mr. Benjamin Carter', 'ben@university.edu', hashedPassword, 'department', null, 'Financial Support', 52],
            ['user_dept_it', 'Ms. Chloe Davis', 'chloe@university.edu', hashedPassword, 'department', null, 'IT', 38],
            ['user_dept_sa', 'Mr. David Chen', 'david@university.edu', hashedPassword, 'department', null, 'Student Affairs', 41],
        ];

        const parsedComplaints = robustCSVParser(complaintsCSV);

        const studentIds = [...new Set(parsedComplaints.map(c => c.Student_ID).filter(id => id && id.startsWith('S')))];
        
        const studentUsers = studentIds.map((studentId, index) => ([
            studentId,
            `Student ${studentId.replace('S','')}`,
            index === 0 ? 'student@university.edu' : `student${studentId.replace('S','')}@university.edu`,
            hashedPassword,
            'student',
            'Computer Science',
            null,
            20 + (index % 5)
        ]));

        const allUsers = [...departmentUsers, ...studentUsers];
        if (allUsers.length > 0) {
             const userMap = new Map(allUsers.map(u => [u[0], { id: u[0], name: u[1] }]));
             
             // Chunk users insert to avoid packet too large errors
             const userChunkSize = 200;
             for (let i = 0; i < allUsers.length; i += userChunkSize) {
                 const chunk = allUsers.slice(i, i + userChunkSize);
                 await connection.query('INSERT INTO users (id, name, email, password, role, major, departmentName, age) VALUES ?', [chunk]);
             }
             console.log(`${allUsers.length} users seeded.`);
             
             const complaintsToSeed = [];
             const uniqueTickets = new Set();

            parsedComplaints.forEach(record => {
                const ticketId = record.Ticket_ID;
                const studentId = record.Student_ID;
                
                if (!ticketId || !studentId || !userMap.has(studentId) || uniqueTickets.has(ticketId)) return;

                let complaintStatus = 'Open';
                if (record.Status === 'Resolved' || record.Status === 'Closed') complaintStatus = 'Closed';
                else if (record.Status === 'Reopened') complaintStatus = 'Reopened';
                else if (record.Status === 'In Progress') complaintStatus = 'Open'; // Normalize "In Progress" to "Open" for simplicity or keep if enum allows
                
                const dateParts = record.Date_Submitted.split('/');
                let mysqlDateTime;
                let resolvedAt = null;

                if (dateParts.length === 3) {
                    const jsDate = new Date(parseInt(dateParts[2]), parseInt(dateParts[1]) - 1, parseInt(dateParts[0]));
                    if (!isNaN(jsDate.getTime())) {
                        mysqlDateTime = jsDate.toISOString().slice(0, 19).replace('T', ' ');
                        if (complaintStatus === 'Closed') {
                             resolvedAt = new Date(jsDate.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
                        }
                    }
                }
                
                if (!mysqlDateTime) {
                    mysqlDateTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
                }

                const complaint = [
                    ticketId,
                    studentId,
                    userMap.get(studentId).name,
                    record.Category,
                    record.Complaint_Text,
                    complaintStatus,
                    record.Priority,
                    mysqlDateTime,
                    resolvedAt,
                    complaintStatus === 'Closed' ? 'The issue has been addressed and resolved by our team.' : '',
                    'Review the student\'s issue and provide a detailed update or solution.'
                ];
                complaintsToSeed.push(complaint);
                uniqueTickets.add(ticketId);
            });

            if (complaintsToSeed.length > 0) {
                // Chunk complaints insert
                const chunkSize = 200;
                for (let i = 0; i < complaintsToSeed.length; i += chunkSize) {
                    const chunk = complaintsToSeed.slice(i, i + chunkSize);
                    await connection.query('INSERT INTO complaints (id, studentId, studentName, department, complaintText, status, priority, createdAt, resolvedAt, solutionText, aiRecommendation) VALUES ?', [chunk]);
                }
                console.log(`${complaintsToSeed.length} complaints seeded.`);
            }
        }
    } catch (err) {
        console.error("Seeding failed", err);
    }
};

module.exports = { pool: getPool(), setupDatabase };