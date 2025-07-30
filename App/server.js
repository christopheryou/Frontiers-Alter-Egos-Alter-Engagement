const express = require('express');
const session = require('express-session');
const path = require('path');
const sql = require('mssql'); // Importing mssql for database connections
const config = require('./config'); // Import the config.js for SQL setup
const InterviewRouter = require('./routes/Interview');
const IntroductionRouter = require('./routes/Introduction');

const baseDir = path.join(__dirname);
const app = express();

// Setup EJS if you are rendering EJS templates (not mandatory for serving static frontend)
app.set('view engine', 'ejs');

// Serve static files from the public directory (for frontend: index.html, index.css, index.js)
app.use(express.static(path.join(__dirname, 'public')));

// To handle JSON requests
app.use(express.json());

// Session configuration
app.use(session({
    secret: process.env.SESSION_KEY, // Make sure SESSION_KEY is in your .env
    resave: false,
    saveUninitialized: true,
    rolling: true,
    cookie: {
        maxAge: 1000 * 60 * 60, // Session lasts for 60 minutes
    }
}));

app.get('/', (req, res) => {
    req.session.params = {};
    req.session.params.condition = "base";
    res.sendFile(path.join(__dirname, 'public', 'pages', 'home.html'));
});

app.post('/Introduction', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'introduction.html'));
});

app.get('/Introduction', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'pages', 'introduction.html'));
});

app.get('/causeError', (req, res) => {
    // Simulate an error
    throw new Error('Something went wrong!');
});

// Custom route for INTERVIEW
app.get('/Interview', (req, res) => {
    res.sendFile(path.join(baseDir, 'public', 'pages', 'interview.html'));
});

app.get('/ReturnUserInfo', (req, res) => {
    if (req.session && req.session.params) {
        // Return the session parameters
        res.json(req.session.params);
    } else {
        // Return an error if session or params are not available
        res.status(400).json({ error: 'No session data found.' });
    }
});



app.use('/Introduction', (req, res, next) => {
    next();
}, IntroductionRouter);

app.use('/Interview', (req, res, next) => {
    next();
}, InterviewRouter);



// Error-handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack); // Log the error (for debugging)
    res.status(500).sendFile(path.join(__dirname, 'public', 'pages', '404.html')); // Serve error page
});

// Handle undefined routes (404 errors)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public', 'pages', '404.html')); // Custom 404 page
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Decide whether to keep the process alive or shut it down
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Optionally handle cleanup or decide to shut down gracefully
});

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});
