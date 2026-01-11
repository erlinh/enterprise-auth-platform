import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'catalogue', timestamp: new Date().toISOString() });
});

app.get('/api/user', (req, res) => {
  // In a real app, you'd validate the token here
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }
  res.json({ message: 'User endpoint', authenticated: true });
});

app.listen(PORT, () => {
  console.log(`Catalogue API server running on http://localhost:${PORT}`);
});
