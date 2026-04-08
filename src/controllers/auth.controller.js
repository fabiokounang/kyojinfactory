const { login } = require("../services/auth.service");

async function loginHandler(req, res) {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: "username and password are required",
    });
  }

  const result = await login(String(username), String(password));
  if (!result) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Login success",
    data: result,
  });
}

function meHandler(req, res) {
  return res.status(200).json({
    success: true,
    data: req.user,
  });
}

module.exports = {
  loginHandler,
  meHandler,
};
