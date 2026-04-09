const { getUserPermissions } = require("../services/permission.service");

async function requireWebAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }

  req.permissions = await getUserPermissions(
    req.session.user.id,
    req.session.user.role
  );

  return next();
}

function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.redirect("/login");
    }
    if (!roles.includes(req.session.user.role)) {
      return res.status(403).send("Forbidden");
    }
    return next();
  };
}

function requireMenuAccess(menuKey) {
  return (req, res, next) => {
    if (!req.session?.user) {
      return res.redirect("/login");
    }

    if (req.session.user.role === "superadmin") {
      return next();
    }

    if (!req.permissions || !req.permissions[menuKey]) {
      return res.status(403).send("Anda tidak punya akses ke menu ini.");
    }
    return next();
  };
}

module.exports = {
  requireWebAuth,
  requireRole,
  requireMenuAccess,
};
