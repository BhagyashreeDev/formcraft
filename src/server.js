import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import formRoutes from './routes/formRoutes.js';

// 1. Load environment variables from .env file into process.env
dotenv.config();

// Connect to MongoDB
connectDB();

// 2. Initialize the Express application
const app = express();

// 3. Define the port the server will listen on
const PORT = process.env.PORT || 5000;

// 4. Middlewares
// Enable CORS so external websites (e.g. portfolio on port 3000 or custom domain) can send form submissions
app.use(cors());

// Parse incoming JSON payloads (e.g. fetch/AJAX submissions)
app.use(express.json());

// Parse incoming URL-encoded form submissions (traditional HTML <form> submits)
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from the "public" folder
app.use(express.static('public'));

// 5. Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'FormCraft API server is running smoothly!',
    timestamp: new Date().toISOString(),
  });
});

// 6. Mount API Routes
app.use('/api', formRoutes);

// 7. Start listening for incoming network requests
app.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`🚀 FormCraft Server is live on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`===============================================`);
});
