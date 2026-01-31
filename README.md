# AI University Ticketing System

A smart, fullstack university ticketing system that uses a hybrid AI approach—leveraging both a local, fine-tuned BERT model and the Google Gemini API—to automatically classify complaints, assign priority, generate actionable recommendations, and streamline issue resolution for students and staff.

## ✨ Core Features

*   **Role-Based Access Control**: Separate, tailored dashboards and functionalities for **Students** and **Department Staff**.
*   **Secure JWT Authentication**: A robust backend using JSON Web Tokens (JWT) for secure login and session management, with all user passwords securely hashed using `bcryptjs`.
*   **Hybrid AI Department Routing**: As a student types their complaint, a lightweight, on-server `BertForSequenceClassification` model provides instant classification to suggest the correct department, with a seamless fallback to the Gemini API for guaranteed uptime.
*   **AI-Powered Priority Assignment**: When a new complaint is submitted, the Gemini AI automatically analyzes the text to assign a priority level (`Urgent`, `High`, `Medium`, `Low`), ensuring critical issues are addressed first.
*   **AI-Powered Solution Generation**: Department staff can instantly generate well-written, empathetic solution drafts in the same language as the complaint (e.g., Arabic or English), significantly speeding up response times.
*   **AI-Powered Student Guidance**: After a ticket is resolved, students can get AI-generated advice on whether the provided solution is adequate or if they should consider reopening the ticket.
*   **Comprehensive Ticket Management**:
    *   **Students**: View personal ticket history, track status, close resolved tickets, or reopen unsatisfactory ones.
    *   **Staff**: View all complaints assigned to their department, filter by status, sort by priority or date, update status, reassign departments, and provide solutions.
*   **Batch AI Processing**: Staff can generate AI solutions for all open tickets in their queue that don't have a draft yet with a single click.
*   **Dynamic Analytics Dashboard**: A dedicated analytics page for department staff with interactive charts visualizing:
    *   Complaint volume over time (filterable by 30 days, 90 days, or all time).
    *   Distribution of complaints across different departments.
    *   Breakdown of tickets by priority and status.
*   **User Profiles**: Both students and staff can view and update their personal information securely.
*   **Dark/Light Mode**: A theme toggle for improved user experience and accessibility, with preferences saved locally.
*   **Real-time Notifications**: An intuitive notification system provides immediate feedback for actions like login, ticket submission, and updates.
*   **Technology**:
    *   Classification model built using HuggingFace Transformers and PyTorch.
    *   Training data prepared specifically for Arabic/English complaint classification.

## 🛠️ Tech Stack

*   **Frontend**:
    *   [React](https://react.dev/) & [TypeScript](https://www.typescriptlang.org/)
    *   [Vite](https://vitejs.dev/) for development and bundling
    *   [Tailwind CSS](https://tailwindcss.com/) for styling
    *   [React Router](https://reactrouter.com/) for navigation
    *   [Chart.js](https://www.chartjs.org/) for data visualization
*   **Backend**:
    *   [Node.js](https://nodejs.org/) & [Express](https://expressjs.com/)
    *   [MySQL2](https://github.com/sidorares/node-mysql2) for database connection
    *   [bcryptjs](https://github.com/dcodeIO/bcrypt.js) for password hashing
    *   [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for JWT authentication
*   **Database**:
    *   [MySQL](https://www.mysql.com/)
*   **AI**:
    *   [Google Gemini API](https://ai.google.dev/) (`gemini-2.5-flash`) for generative tasks (priority, solutions, recommendations).
    *   [Hugging Face Transformers.js](https://huggingface.co/docs/transformers.js) with a local `BertForSequenceClassification` model for fast, fine-tuned text classification.

## 🤖 AI Model Performance & Training

The local text classification model (`BertForSequenceClassification`) was fine-tuned on a dataset of university complaints to accurately predict the correct department. This ensures fast, on-server classification with a high degree of accuracy, falling back to the Gemini API only when necessary.

### Classification Report

The model was evaluated on a held-out test set, achieving an overall accuracy of **96%**. The performance across the four departments is as follows:

| Department                       | Precision | Recall | F1-Score | Support |
| -------------------------------- | :-------: | :----: | :------: | :-----: |
| Academic Support and Resources   |   0.95    |  0.93  |   0.94   |   148   |
| Financial Support                |   0.97    |  0.98  |   0.98   |   150   |
| IT                               |   0.94    |  0.98  |   0.96   |   135   |
| Student Affairs                  |   0.99    |  0.96  |   0.97   |   147   |
| **Accuracy**                     |           |        | **0.96** | **580** |
| **Macro Avg**                    | **0.96**  | **0.96** | **0.96** | **580** |
| **Weighted Avg**                 | **0.96**  | **0.96** | **0.96** | **580** |

### Training Details

-   **Model**: `BERT-base-multilingual-uncased`
-   **Dataset Size**: 5,788 complaints
-   **Data Split**: 70% training, 20% validation, 10% testing
-   **Training Time**: 4 epochs
-   **Final Accuracy**: 96%

## 🚀 Getting Started

Follow these instructions precisely to get the project up and running on your local machine.

### Prerequisites

*   [Node.js](https://nodejs.org/en) (v18+ recommended)
*   A running [MySQL](https://www.mysql.com/) instance on your local machine.

---

### 1. Backend Setup (`server` directory)

First, we'll set up and start the backend server.

1.  **Navigate to the server directory**:
    ```bash
    cd server
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Set up Environment Variables**:
    Create a new file named `.env` in the `server` directory. Copy the contents below into this new file and fill in your specific credentials.

    ```env
    # MySQL Database Connection
    DB_HOST="localhost"
    DB_USER="root"
    DB_PASSWORD=""
    DB_NAME="ai_helpdesk2"

    # Security - Use a long, random string for JWT
    JWT_SECRET="a-very-long-and-secure-random-string-for-jwt-!@#$%"

    # Google Gemini API Key
    API_KEY="REPLACE_WITH_YOUR_GEMINI_API_KEY"
    ```
    *   Update `DB_PASSWORD` with your actual MySQL root password. Leave it blank if you don't have one.
    *   Replace `REPLACE_WITH_YOUR_GEMINI_API_KEY` with your actual Google Gemini API key.

4.  **Start the Server**:
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3009`. On its first run, it will automatically connect to MySQL, create the `ai_helpdesk2` database if it doesn't exist, create the required tables, and fill them with sample data.

    **Leave this terminal running.**

---

### 2. Frontend Setup (`client` directory)

Now, in a **new, separate terminal window**, we'll set up and start the frontend application.

1.  **Navigate to the client directory**:
    ```bash
    cd client
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the Development Server**:
    ```bash
    npm run dev
    ```
    The frontend application will now be running and accessible, typically at `http://localhost:5173`. It is pre-configured to automatically talk to your backend server via a proxy.

## MySQL Database Schema

This is the SQL schema for the tables used in the application. The backend server (`server/database.js`) will automatically create these tables and seed them with data on its first run if they do not exist. This is provided for reference.

```sql
-- Create the database if it doesn't exist
CREATE DATABASE IF NOT EXISTS ai_helpdesk2;

-- Use the newly created database
USE ai_helpdesk2;

-- Create the 'users' table
-- This table stores information for both students and department staff.
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    major VARCHAR(255) NULL,
    departmentName VARCHAR(255) NULL,
    age INT NULL
);

-- Create the 'complaints' table
-- This table holds all the ticketing data.
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
    solutionText TEXT NULL,
    aiRecommendation TEXT NULL,
    FOREIGN KEY (studentId) REFERENCES users(id) ON DELETE CASCADE
);
```

## How to Use

Once both the backend and frontend servers are running:

1.  **Open the frontend URL** (`http://localhost:5173` or similar) in your web browser.
2.  **Sign Up**: Create a new account as either a "Student" or "Department Staff".
3.  **Log In**: Use the sample credentials printed in the server terminal, or the account you just created.
    *   **Student**: `student@university.edu` / `password`
    *   **IT Staff**: `chloe@university.edu` / `password`

## Project Structure

```
.
├── client/
│   ├── public/
│   ├── src/                # Frontend source code (React components, pages, etc.)
│   ├── index.html          # HTML entry point for Vite
│   ├── package.json        # Frontend dependencies and scripts
│   └── ...                 # Other config files (vite, tailwind, postcss)
├── server/
│   ├── classification/     # Local BERT model files
│   ├── data/
│   │   └── complaints.csv.ts # Sample data for seeding
│   ├── .env                # YOUR SERVER ENVIRONMENT VARIABLES
│   ├── database.js         # MySQL connection, table setup, and data seeding
│   ├── package.json        # Backend dependencies and scripts
│   └── server.js           # Express backend logic and API endpoints
└── README.md               # You are here!
```

## 🙏 Acknowledgments

*   **Team Members**:
    *   Eng / Ahmed Said Roshdy Sharkawy -- WhatsApp: [http://wa.me/201092621367](http://wa.me/201092621367)
    *   Eng / Abdelrahman Emad Shamikh Ali -- WhatsApp: [http://wa.me/201141307336](http://wa.me/201141307336)
*   **Supervisor**: Project developed under the supervision of Eng/ Baraa Abu Sallout.
*   **Guidelines**: Following DEPI Graduation Project guidelines.