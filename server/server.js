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

