const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock users database
let users = [];

router.post('/register', (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = bcrypt.hashSync(password, 10);
  users.push({ username, password: hashedPassword });

  res.status(200).send('User registered successfully!');
});

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  const user = users.find(user => user.username === username);
  if (!user) {
    return res.status(404).send('User not found!');
  }

  const validPassword = bcrypt.compareSync(password, user.password);
  if (!validPassword) {
    return res.status(401).send('Invalid password!');
  }

  const token = jwt.sign({ username }, 'secret-key', { expiresIn: '1h' });

  res.status(200).json({ token });
});

module.exports = router;