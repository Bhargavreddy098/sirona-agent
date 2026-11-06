import express from "express";
import Joi from "joi";
import { authController } from "../controllers/authController.js";
import { userAuth } from "../middleware/userAuth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  name: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

router.post("/register", validate(registerSchema), authController.register);
router.post("/login", validate(loginSchema), authController.login);
router.post("/google", authController.googleAuth);
router.get("/me", userAuth, authController.getMe);
router.post("/logout", userAuth, authController.logout);

export default router;
