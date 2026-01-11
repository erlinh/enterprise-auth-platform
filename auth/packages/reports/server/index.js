import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3012;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'reports', timestamp: new Date().toISOString() });
});

app.get('/api/reports', (req, res) => {
  res.json([
    { id: 1, name: 'Q4 Sales Report', type: 'Sales', date: '2024-01-15', status: 'completed' },
    { id: 2, name: 'Monthly Active Users', type: 'Analytics', date: '2024-01-14', status: 'completed' },
    { id: 3, name: 'Security Audit 2024', type: 'Security', date: '2024-01-12', status: 'completed' },
  ]);
});

app.get('/api/user', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  res.json({ message: 'User endpoint', authenticated: true });
});

app.listen(PORT, () => {
  console.log(`Reports API server running on http://localhost:${PORT}`);
});
