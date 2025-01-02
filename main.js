const express = require('express');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const { Client } = require('cassandra-driver');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Cassandra DB Setup
const client = new Client({
  cloud: { secureConnectBundle: '/path/to/secure-connect-database.zip' }, // Your Astra DB bundle
  credentials: { username: 'your_client_id', password: 'your_client_secret' },
});

// Create Users Table (Cassandra)
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      password TEXT,
      created_at TIMESTAMP
    );
  `;
  await client.execute(query);
};

// Sign Up Endpoint
app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (email, password, created_at) VALUES (?, ?, ?)';
    const params = [email, hashedPassword, new Date()];
    
    await client.execute(query, params, { prepare: true });
    res.json({ message: 'User created successfully!', success: true });
  } catch (err) {
    res.json({ message: 'Error creating user: ' + err.message, success: false });
  }
});

// Login Endpoint
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  
  try {
    const query = 'SELECT password FROM users WHERE email = ?';
    const result = await client.execute(query, [email], { prepare: true });
    
    if (result.rowLength === 0) {
      return res.json({ message: 'Email not found.', success: false });
    }
    
    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (isMatch) {
      res.json({ message: 'Login successful!', success: true });
    } else {
      res.json({ message: 'Invalid credentials.', success: false });
    }
  } catch (err) {
    res.json({ message: 'Error logging in: ' + err.message, success: false });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  createTable();
});
