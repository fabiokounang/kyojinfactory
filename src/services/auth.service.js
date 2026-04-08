const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { jwtSecret } = require("../config/env");
const { getDb } = require("../database/sqlite");

async function login(username, password) {
  const db = await getDb();
  const user = await db.get(
    "SELECT id, username, password_hash, role FROM users WHERE username = ?",
    username
  );
  if (!user) {
    return null;
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return null;
  }

  const token = jwt.sign(
    { sub: user.id, username: user.username, role: user.role },
    jwtSecret,
    { expiresIn: "12h" }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

module.exports = {
  login,
};
