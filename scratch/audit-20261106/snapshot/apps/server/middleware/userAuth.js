import jwt from "jsonwebtoken";
import { User } from "../model/User.js";

/* =====================================================================
   User Authentication Middleware (JWT & Desktop Token)
   ===================================================================== */

const JWT_SECRET = process.env.JWT_SECRET || "sirona_desktop_secret_key";

export async function userAuth(req, res, next) {
  let token = null;

  // 1. Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Local desktop convenience: If no auth configured and no token, allow local guest
  if (!token) {
    if (process.env.REQUIRE_AUTH === "true") {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }
    req.user = { id: null, email: "developer@sirona.local", is_local: true };
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ success: false, message: "User account no longer exists" });
    }

    // Verify token version for instant token invalidation upon password reset/logout
    if (decoded.token_version !== undefined && user.token_version !== decoded.token_version) {
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
}

export default userAuth;
