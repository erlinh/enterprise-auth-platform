import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3013;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'settings', timestamp: new Date().toISOString() });
});

app.get('/api/preferences', (req, res) => {
  res.json({
    theme: 'dark',
    language: 'en',
    notifications: {
      email: true,
      push: false,
      weekly: true,
    },
  });
});

app.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  res.json({ message: 'User endpoint', authenticated: true });
});

app.listen(PORT, () => {
  console.log(`Settings API server running on http://localhost:${PORT}`);
});
