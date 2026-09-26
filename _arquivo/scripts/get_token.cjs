const jwt = require('jsonwebtoken');
require('dotenv').config();

const token = jwt.sign({ id: 1, email: 'admin@studioacorde.com', role: 'admin' }, process.env.JWT_SECRET || 'studio-acorde-secret-key-2024');
console.log("TOKEN:", token);
