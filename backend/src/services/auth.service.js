const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

function signToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

exports.register = async ({ name, email, password, role }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new ApiError(409, 'Email already in use');
  const user = new User({ name, email, role: role || 'user' });
  await user.setPassword(password);
  await user.save();
  return { user, token: signToken(user) };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError(401, 'Invalid credentials');
  const ok = await user.verifyPassword(password);
  if (!ok) throw new ApiError(401, 'Invalid credentials');
  return { user, token: signToken(user) };
};
