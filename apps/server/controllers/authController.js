import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../model/User.js";
import { auditLogger } from "../services/auditLogger.js";

const JWT_SECRET = process.env.JWT_SECRET || "sirona_desktop_secret_key";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

const googleClient = process.env.GOOGLE_CLIENT_ID
  ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID)
  : null;

function issueToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

export const authController = {
  async register(req, res, next) {
    try {
      const { email, password, name } = req.body;
      const existing = await User.findByEmail(email);
      if (existing) {
        return res.status(409).json({ success: false, message: "Email already registered" });
      }

      const user = await User.create({ email, password, name });
      const token = issueToken(user);

      auditLogger.log(req, "auth.register", { resourceType: "user", resourceId: user.id });

      res.status(201).json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await User.findByEmail(email);
      if (!user || !user.password_hash) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      const valid = await User.verifyPassword(password, user.password_hash);
      if (!valid) {
        return res.status(401).json({ success: false, message: "Invalid email or password" });
      }

      const token = issueToken(user);
      auditLogger.log(req, "auth.login", { resourceType: "user", resourceId: user.id });

      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },

  async googleAuth(req, res, next) {
    try {
      const { credential } = req.body;
      if (!googleClient) {
        return res.status(500).json({ success: false, message: "Google Auth not configured on server" });
      }

      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      const { sub: googleId, email, name, picture } = payload;

      let user = await User.findByGoogleId(googleId);
      if (!user) {
        user = await User.findByEmail(email);
        if (user) {
          user = await User.update(user.id, { google_id: googleId, avatar_url: picture });
        } else {
          user = await User.create({ email, name, avatar_url: picture, google_id: googleId });
        }
      }

      const token = issueToken(user);
      auditLogger.log(req, "auth.google", { resourceType: "user", resourceId: user.id });

      res.json({
        success: true,
        token,
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      next(err);
    }
  },

  async getMe(req, res) {
    res.json({
      success: true,
      user: req.user,
    });
  },

  async logout(req, res, next) {
    try {
      if (req.user?.id) {
        await User.incrementTokenVersion(req.user.id);
        auditLogger.log(req, "auth.logout", { resourceType: "user", resourceId: req.user.id });
      }
      res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  },
};

export default authController;
