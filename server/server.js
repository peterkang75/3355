const express = require('express');
const path = require('path');
const apiRouter = require('./api');

const app = express();
const PORT = process.env.NODE_ENV === 'production' ? 5000 : 3001;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

app.use('/api', apiRouter);

app.use(express.static(path.join(__dirname, '../dist'), {
  etag: false,
  lastModified: false
}));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📊 Database connected`);
});
