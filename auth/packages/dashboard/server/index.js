import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3011;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'dashboard', timestamp: new Date().toISOString() });
});

app.get('/api/metrics', (req, res) => {
  res.json({
    totalUsers: 12847,
    activeSessions: 3421,
    apiCalls: 847000,
    errorRate: 0.12,
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
  console.log(`Dashboard API server running on http://localhost:${PORT}`);
});
