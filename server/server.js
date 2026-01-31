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

const LABEL_TO_DEPARTMENT = {
    'LABEL_0': 'Academic Support and Resources',
    'LABEL_1': 'Financial Support',
    'LABEL_2': 'IT',
    'LABEL_3': 'Student Affairs'
};


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


// --- Hugging Face Classifier Initialization ---
let hfClassifier = null;

// Only load local models if NOT running on Vercel. 
// Vercel serverless functions have size limits (50MB) and read-only file systems 
// which makes loading local heavy models difficult and error-prone.
if (!process.env.VERCEL) {
    import('@xenova/transformers').then(transformers => {
        console.log('Hugging Face Transformers.js library loaded.');
        transformers.pipeline('text-classification', './classification')
            .then(pipeline => {
                hfClassifier = pipeline;
                console.log('Local BERT text classification pipeline is ready.');
            })
            .catch(err => {
                console.warn('Local BERT model failed to load. Falling back to Cloud AI.', err.message);
            });
    }).catch(err => console.error('Failed to load @xenova/transformers.', err));
} else {
    console.log('Running on Vercel: Local BERT model disabled to optimize serverless performance. Using Gemini Fallback.');
}


// --- HELPER FUNCTIONS (Gemini API Calls) ---
const generateGeminiResponse = async (prompt, useThinking = false) => {
    if (!API_KEY) throw new Error("API Key missing");
    try {
        const config = {};
        // Future of AI: Use Thinking Config for complex reasoning tasks
        if (useThinking) {
            config.thinkingConfig = { thinkingBudget: 1024 }; 
        }

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
    // In serverless, we might need to ensure DB setup is triggered if containers are recycled
    // However, setupDatabase checks IF NOT EXISTS, so it's safe to call, but to save time 
    // on every request, we assume the initial deployment hook or local dev handles it.
    // For this demo, we'll keep it lightweight.
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
                // Use thinking for better reasoning on recommendations
                aiRecommendation = await generateGeminiResponse(recommendationPrompt, true);
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

    // 1. Try Local BERT Classifier first (if loaded)
    if (hfClassifier) {
        try {
            console.log("Using local BERT classifier for department suggestion.");
            const output = await hfClassifier(complaintText, { topk: 1 });
            const topResult = output[0];
            const department = LABEL_TO_DEPARTMENT[topResult.label];
            
            if (department) {
                const suggestion = {
                    department: department,
                    reason: `AI classified this for ${department} (Local Model Confidence: ${Math.round(topResult.score * 100)}%).`
                };
                return res.json(suggestion);
            }
        } catch(error) {
            console.warn("Local BERT classifier error, attempting fallback:", error.message);
        }
    }
    
    // 2. Fallback to Gemini (Cloud)
    try {
        if (!API_KEY) throw new Error("No API Key");
        console.log("Using Gemini for department suggestion (Fallback).");
        const prompt = `Analyze the following student complaint to determine the most relevant department and provide a brief reason. Analyze the language of the complaint (e.g., Arabic or English) and provide your reason in that SAME language. The available departments are: "${DEPARTMENTS.join('", "')}".
    
Complaint: "${complaintText}"
    
Respond in JSON format with "department" and "reason" keys.`;
        const departmentSchema = { type: Type.OBJECT, properties: { department: { type: Type.STRING, enum: DEPARTMENTS }, reason: { type: Type.STRING } } };

        const suggestion = await generateJsonGeminiResponse(prompt, departmentSchema);
        res.json(suggestion);
    } catch(error) {
        console.error("All AI suggestion methods failed:", error.message);
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
        const solution = await generateGeminiResponse(prompt, true);
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
        const recommendation = await generateGeminiResponse(prompt, true);
        res.json({ recommendationText: recommendation });
    } catch(error) {
        res.status(500).json({ message: "Failed to generate AI advice." });
    }
});


// --- START SERVER (Adapted for Vercel) ---
// If running directly (node server.js), start listening.
// If running on Vercel, export the app.
if (require.main === module) {
    const startServer = async () => {
        await setupDatabase();
        const PORT = process.env.PORT || 3009;
        app.listen(PORT, () => {
            console.log(`🚀 Server is running on http://localhost:${PORT}`);
            console.log('--------------------------------');
            console.log(`AI Configuration:`);
            console.log(`- API Key Status: ${API_KEY ? 'Present' : 'Missing (AI Features Disabled)'}`);
            console.log(`- Local BERT Model: ${hfClassifier ? 'Loaded' : 'Loading/Unavailable'}`);
            console.log('--------------------------------');
        });
    };
    startServer();
}

module.exports = app;
