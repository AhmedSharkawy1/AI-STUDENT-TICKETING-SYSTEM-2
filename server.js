
// require('dotenv').config(); // Using hardcoded credentials provided by user
const express = require('express');
const cors = require('cors');
const { GoogleGenAI, Type } = require("@google/genai");
const { pool, setupDatabase } = require('./database');

// --- INITIALIZATION ---
const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: "ADD YOUR API_KEY HERE" });
const DEPARTMENTS = [
    'Academic Support and Resources',
    'Financial Support',
    'IT',
    'Student Affairs'
];

// --- HELPER FUNCTIONS (Gemini API Calls) ---

const generateGeminiResponse = async (prompt) => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error('Gemini API Error:', error);
        throw new Error('Failed to generate response from AI service.');
    }
};

const generateJsonGeminiResponse = async (prompt) => {
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        department: {
                            type: Type.STRING,
                            enum: DEPARTMENTS,
                        },
                        reason: {
                            type: Type.STRING,
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error('Gemini API JSON Error:', error);
        throw new Error('Failed to generate JSON response from AI service.');
    }
}

// --- API ENDPOINTS ---

// AUTH
app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
        return res.status(400).json({ message: 'Email, password, and role are required.' });
    }
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND role = ?', [email.toLowerCase(), role]);
        const user = rows[0];
        if (user && user.password === password) {
            const { password: _, ...userToReturn } = user;
            res.json(userToReturn);
        } else {
            res.status(401).json({ message: 'Invalid credentials or role.' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error during login.' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role, major, departmentName } = req.body;
    
    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        
        const id = `user_${Date.now()}`;
        const newUser = { id, name, email, password, role, major, departmentName };
        
        await pool.query('INSERT INTO users SET ?', newUser);
        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Internal server error during signup.' });
    }
});

// USERS
app.get('/api/users', async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, major, departmentName FROM users');
        res.json(users);
    } catch (error) {
        console.error('Fetch users error:', error);
        res.status(500).json({ message: 'Internal server error fetching users.' });
    }
});


// COMPLAINTS
app.get('/api/complaints', async (req, res) => {
    try {
        const [complaints] = await pool.query('SELECT * FROM complaints ORDER BY createdAt DESC');
        res.json(complaints);
    } catch (error) {
        console.error('Fetch complaints error:', error);
        res.status(500).json({ message: 'Internal server error fetching complaints.' });
    }
});

app.post('/api/complaints', async (req, res) => {
    const { studentId, studentName, department, complaintText, priority } = req.body;
    try {
        const id = `complaint_${Date.now()}`;
        const createdAt = new Date();
        const status = 'Open';

        const recommendationPrompt = `You are an AI assistant for a university help desk. A student has filed a complaint. Your task is to provide a concise, actionable recommendation for the staff member handling this ticket. Analyze the language of the complaint (e.g., Arabic or English) and provide your recommendation in that SAME language.
        
        Student Complaint: "${complaintText}"
        
        Actionable Recommendation for Staff:`;
        const aiRecommendation = await generateGeminiResponse(recommendationPrompt);

        const newComplaint = { id, studentId, studentName, department, complaintText, status, priority, createdAt, aiRecommendation, solutionText: '' };
        
        await pool.query('INSERT INTO complaints SET ?', newComplaint);

        res.status(201).json(newComplaint);
    } catch (error) {
        console.error("Error creating complaint: ", error);
        res.status(500).json({ message: 'Failed to create complaint.' });
    }
});

app.put('/api/complaints/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
        // Handle date conversion if present
        if (updates.createdAt) {
            updates.createdAt = new Date(updates.createdAt).toISOString().slice(0, 19).replace('T', ' ');
        }

        const [result] = await pool.query('UPDATE complaints SET ? WHERE id = ?', [updates, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Complaint not found.' });
        }

        const [updatedRows] = await pool.query('SELECT * FROM complaints WHERE id = ?', [id]);
        res.json(updatedRows[0]);
    } catch (error) {
        console.error(`Error updating complaint ${id}:`, error);
        res.status(500).json({ message: 'Failed to update complaint.' });
    }
});

// AI Endpoints
app.post('/api/ai/suggest-department', async (req, res) => {
    const { complaintText } = req.body;
    const prompt = `Analyze the following student complaint to determine the most relevant department and provide a brief reason. Analyze the language of the complaint (e.g., Arabic or English) and provide your reason in that SAME language. The available departments are: "${DEPARTMENTS.join('", "')}".
    
    Complaint: "${complaintText}"
    
    Respond in JSON format with "department" and "reason" keys.`;
    try {
        const suggestion = await generateJsonGeminiResponse(prompt);
        res.json(suggestion);
    } catch(error) {
        res.status(500).json({ message: "Failed to get AI suggestion." });
    }
});

app.post('/api/complaints/:id/generate-solution', async (req, res) => {
    const { complaintText, department } = req.body;
    const prompt = `You are an AI assistant for a university help desk staff member in the "${department}" department. Your task is to write a polite, professional, and empathetic response to a student's complaint. The response should acknowledge their issue and suggest a clear solution or next step. Analyze the language of the original complaint (e.g., Arabic or English) and write your entire response in that SAME language.

    Student's Complaint: "${complaintText}"
    
    Draft of Solution for Student:`;
    try {
        const solution = await generateGeminiResponse(prompt);
        res.json({ solutionText: solution });
    } catch(error) {
        res.status(500).json({ message: "Failed to generate AI solution." });
    }
});

app.post('/api/complaints/:id/generate-student-recommendation', async (req, res) => {
    const { complaintText, solutionText } = req.body;
    const prompt = `You are an impartial AI student advocate. Your task is to analyze a student's complaint and the solution provided by the university staff. Provide a concise recommendation to the student on whether the solution is adequate or if they should consider reopening the ticket. Analyze the language of the original complaint (e.g., Arabic or English) and write your entire response in that SAME language.

    Original Complaint: "${complaintText}"
    Staff's Solution: "${solutionText}"
    
    AI Advice for Student:`;
    try {
        const recommendation = await generateGeminiResponse(prompt);
        res.json({ recommendationText: recommendation });
    } catch(error) {
        res.status(500).json({ message: "Failed to generate AI advice." });
    }
});


// --- START SERVER ---
const startServer = async () => {
  await setupDatabase();
  const PORT = 3009;
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log('--- Sample Login Credentials ---');
    console.log('Student: student@university.edu / password');
    console.log('IT Staff: chloe@university.edu / password');
    console.log('--------------------------------');
  });
};

startServer();