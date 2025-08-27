import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat.js';

dotenv.config();

const app = express();

// allow your front-end origin
app.use(cors({ 
  origin: ['http://localhost:3000', 'https://cortex-ai.vercel.app'],
  credentials: true 
}));
// bump JSON limit so data URLs don’t get cut off
app.use(express.json({ limit: '15mb' }));

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