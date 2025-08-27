import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// allow your front-end origin
app.use(cors({ 
  origin: ['http://localhost:3000', 'https://cortex-ai-alpha.vercel.app'],
  credentials: true 
}));

// Add a simple test route to debug
app.get('/test', (req, res) => {
  res.json({ message: 'Server is running!', timestamp: new Date().toISOString() });
});

// Simple root endpoint
app.get('/', (req, res) => {
  res.json({ message: 'Express server is running!', status: 'ok' });
});
// bump JSON limit so data URLs don’t get cut off
app.use(express.json({ limit: '15mb' }));

// Add a simple chat test route
app.get('/chat/test', (req, res) => {
  res.json({ message: 'Chat route is working!', status: 'ok' });
});

// Add basic chat routes without complex services
app.get('/chat', (req, res) => {
  res.json({ message: 'Chat endpoint reached!', status: 'ok' });
});

app.post('/chat/start', (req, res) => {
  res.json({ message: 'Chat start endpoint reached!', status: 'ok' });
});

// Add GET version for testing
app.get('/chat/start', (req, res) => {
  res.json({ message: 'Chat start GET endpoint reached!', status: 'ok', method: 'GET' });
});

app.get('/chat/sessions', (req, res) => {
  res.json({ message: 'Chat sessions endpoint reached!', status: 'ok' });
});

// Add the real chat routes
import chatRoutes from './routes/chat.js';
app.use('/chat', chatRoutes);

const PORT = process.env.PORT || 3001;

// Only listen on port if not on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for Vercel
export default app;