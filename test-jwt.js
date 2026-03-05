const jwt = require('jsonwebtoken');
const { Types } = require('mongoose');

try {
  const insertedId = new Types.ObjectId();
  const token = jwt.sign({ id: insertedId, type: 'reset' }, 'super_secure_secret', { expiresIn: '24h' });
  console.log("Token:", token);
  const decoded = jwt.verify(token, 'super_secure_secret');
  console.log("Decoded id typeof:", typeof decoded.id);
  console.log("Decoded:", decoded);
} catch (e) {
  console.error("Error expected or not:", e.message);
}
