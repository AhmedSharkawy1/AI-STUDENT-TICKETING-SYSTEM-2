require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { GoogleGenAI, Type } = require("@google/genai");
const { pool, setupDatabase } = require('./database');

// --- INITIALIZATION ---
const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'default-dev-secret';
const API_KEY = process.env.API_KEY;

if (!API_KEY) {
    console.warn("WARNING: API_KEY is missing. AI features will fail or run in fallback mode.");
}

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: API_KEY || "dummy_key" });

const DEPARTMENTS = [
    'Academic Support and Resources',
    'Financial Support',
    'IT',
    'Student Affairs'
];

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) return res.status(401).json({ message: 'Unauthorized' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- HELPER FUNCTIONS (Gemini API Calls) ---
const generateGeminiResponse = async (prompt, useThinking = false) => {
    if (!API_KEY) throw new Error("API Key missing");
    try {
        const config = {};
        // Thinking budget config could be added here if supported by the model version
        // config.thinkingConfig = { thinkingBudget: 1024 }; 

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: config
        });
        return response.text ? response.text.trim() : '';
    } catch (error) {
        console.error('Gemini API Error:', error.message);
        throw new Error('Failed to generate response from AI service.');
    }
};

const generateJsonGeminiResponse = async (prompt, schema) => {
    if (!API_KEY) throw new Error("API Key missing");
     try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema
            }
        });
        
        // Robust JSON parsing: clean potential markdown code blocks
        let text = response.text || "{}";
        text = text.replace(/```json\n?|```/g, '').trim();
        
        try {
            return JSON.parse(text);
        } catch (e) {
            console.warn("JSON Parse failed, attempting fallback...", e);
            return {};
        }
    } catch (error) {
        console.error('Gemini API JSON Error:', error.message);
        throw new Error('Failed to generate JSON response from AI service.');
    }
}


// --- API ENDPOINTS ---

// Check DB Connection on startup (Lazy load for Serverless)
app.use(async (req, res, next) => {
    next();
});

// AUTH
app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE email = ? AND role = ?', [email.toLowerCase(), role]);
        const user = rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const { password: _, ...userToReturn } = user;
            const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
            res.json({ token, user: userToReturn });
        } else {
            res.status(401).json({ message: 'Invalid credentials or role.' });
        }
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/auth/signup', async (req, res) => {
    const { name, email, password, role, major, departmentName, age } = req.body;
    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'An account with this email already exists.' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const id = role === 'student' ? `S${Date.now()}` : `D${Date.now()}`;
        const newUser = { id, name, email: email.toLowerCase(), password: hashedPassword, role, major, departmentName, age };
        
        await pool.query('INSERT INTO users SET ?', newUser);
        const { password: _, ...userToReturn } = newUser;
        res.status(201).json(userToReturn);
    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// USERS
app.get('/api/users', authenticateToken, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, name, email, role, major, departmentName, age FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.put('/api/users/profile', authenticateToken, async (req, res) => {
    const userId = req.user.userId;
    const userRole = req.user.role;
    const { name, email, major, age, departmentName } = req.body;

    try {
        const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email.toLowerCase(), userId]);
        if (existing.length > 0) {
            return res.status(409).json({ message: 'This email is already in use by another account.' });
        }

        const updateData = { name, email: email.toLowerCase() };

        if (userRole === 'student') {
            updateData.major = major;
            updateData.age = age ? parseInt(age, 10) : null;
        } else if (userRole === 'department') {
            updateData.departmentName = departmentName;
        }

        await pool.query('UPDATE users SET ? WHERE id = ?', [updateData, userId]);
        
        const [updatedRows] = await pool.query('SELECT id, name, email, role, major, departmentName, age FROM users WHERE id = ?', [userId]);

        res.json(updatedRows[0]);

    } catch (error) {
        console.error("Profile update error:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// COMPLAINTS
app.get('/api/complaints', authenticateToken, async (req, res) => {
    try {
        const [complaints] = await pool.query('SELECT * FROM complaints ORDER BY createdAt DESC');
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.post('/api/complaints', authenticateToken, async (req, res) => {
    const { studentId, studentName, department, complaintText, priority: clientPriority } = req.body;
    try {
        const id = `TCKT${Date.now()}`;
        const createdAt = new Date();
        const status = 'Open';

        // 1. AI Priority Assignment (Non-blocking)
        let priority = clientPriority || 'Medium'; 
        try {
            if (API_KEY) {
                const priorityPrompt = `Analyze the urgency of the following student complaint and classify it into one of four priority levels: "Urgent", "High", "Medium", "Low". Respond in JSON format with a single key "priority".
                
Complaint: "${complaintText}"`;
                const prioritySchema = { type: Type.OBJECT, properties: { priority: { type: Type.STRING, enum: ["Urgent", "High", "Medium", "Low"] } } };
                const result = await generateJsonGeminiResponse(priorityPrompt, prioritySchema);
                if (result && result.priority) priority = result.priority;
            }
        } catch (aiError) {
            console.warn(`AI Priority assignment failed (using fallback '${priority}'):`, aiError.message);
        }

        // 2. AI Staff Recommendation (Non-blocking)
        let aiRecommendation = null;
        try {
            if (API_KEY) {
                const recommendationPrompt = `You are an AI assistant for a university help desk. A student has filed a complaint. Your task is to provide a concise, actionable recommendation for the staff member handling this ticket. Analyze the language of the complaint (e.g., Arabic or English) and provide your recommendation in that SAME language.
                
Student Complaint: "${complaintText}"
                
Actionable Recommendation for Staff:`;
                aiRecommendation = await generateGeminiResponse(recommendationPrompt, false);
            }
        } catch (aiError) {
            console.warn("AI Recommendation failed:", aiError.message);
            aiRecommendation = "AI recommendation temporarily unavailable.";
        }

        const newComplaint = { id, studentId, studentName, department, complaintText, status, priority, createdAt, aiRecommendation, solutionText: '' };
        
        await pool.query('INSERT INTO complaints SET ?', newComplaint);

        res.status(201).json(newComplaint);
    } catch (error) {
        console.error("Error creating complaint: ", error);
        res.status(500).json({ message: 'Failed to create complaint.' });
    }
});

app.put('/api/complaints/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    try {
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
app.post('/api/ai/suggest-department', authenticateToken, async (req, res) => {
    const { complaintText } = req.body;
    if (!complaintText) {
        return res.status(400).json({ message: 'complaintText is required.' });
    }

    try {
        if (!API_KEY) throw new Error("No API Key");
        console.log("Using Gemini for department suggestion.");
        const prompt = `Analyze the following student complaint to determine the most relevant department and provide a brief reason. Analyze the language of the complaint (e.g., Arabic or English) and provide your reason in that SAME language. The available departments are: "${DEPARTMENTS.join('", "')}".
    
Complaint: "${complaintText}"
    
Respond in JSON format with "department" and "reason" keys.`;
        const departmentSchema = { type: Type.OBJECT, properties: { department: { type: Type.STRING, enum: DEPARTMENTS }, reason: { type: Type.STRING } } };

        const suggestion = await generateJsonGeminiResponse(prompt, departmentSchema);
        res.json(suggestion);
    } catch(error) {
        console.error("AI suggestion failed:", error.message);
        res.status(200).json({ 
            department: DEPARTMENTS[3], // Default to Student Affairs
            reason: "AI suggestion unavailable. Defaulting to general support." 
        });
    }
});


app.post('/api/complaints/:id/generate-solution', authenticateToken, async (req, res) => {
    const { complaintText, department } = req.body;
    const prompt = `You are an AI assistant for a university help desk staff member in the "${department}" department. Your task is to write a polite, professional, and empathetic response to a student's complaint. The response should acknowledge their issue and suggest a clear solution or next step. Analyze the language of the original complaint (e.g., Arabic or English) and write your entire response in that SAME language.

Student's Complaint: "${complaintText}"
    
Draft of Solution for Student:`;
    try {
        const solution = await generateGeminiResponse(prompt, false);
        res.json({ solutionText: solution });
    } catch(error) {
        res.status(500).json({ message: "Failed to generate AI solution." });
    }
});

app.post('/api/complaints/:id/generate-student-recommendation', authenticateToken, async (req, res) => {
    const { complaintText, solutionText } = req.body;
    const prompt = `You are an impartial AI student advocate. Your task is to analyze a student's complaint and the solution provided by the university staff. Provide a concise recommendation to the student on whether the solution is adequate or if they should consider reopening the ticket. Analyze the language of the original complaint (e.g., Arabic or English) and write your entire response in that SAME language.

Original Complaint: "${complaintText}"
Staff's Solution: "${solutionText}"
    
AI Advice for Student:`;
    try {
        const recommendation = await generateGeminiResponse(prompt, false);
        res.json({ recommendationText: recommendation });
    } catch(error) {
        res.status(500).json({ message: "Failed to generate AI advice." });
    }
});


// --- START SERVER (Adapted for Vercel) ---
if (require.main === module) {
    const startServer = async () => {
        await setupDatabase();
        const PORT = process.env.PORT || 3009;
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log('--------------------------------');
            console.log(`AI Configuration:`);
            console.log(`- API Key Status: ${API_KEY ? 'Present' : 'Missing (AI Features Disabled)'}`);
            console.log('--------------------------------');
        });
    };
    startServer();
}

module.exports = app;