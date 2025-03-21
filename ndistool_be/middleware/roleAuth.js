// middleware/roleAuth.js
const { ROLES, PERMISSIONS } = require("../config/roles");

/**
 * Check if user has the required permission
 * @param {string} permission - The permission to check
 * @returns {boolean} Whether the user has the permission
 */
const hasPermission = (permission, userRole) => {
  if (!PERMISSIONS[permission]) {
    return false;
  }

  return PERMISSIONS[permission].includes(userRole);
};

/**
 * Middleware to check if a user has the required permission
 * @param {string} permission - The permission to check
 * @returns {Function} Express middleware
 */
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (hasPermission(permission, req.user.role)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: "Permission denied",
      });
    }
  };
};

module.exports = {
  checkPermission,
  hasPermission,
};
