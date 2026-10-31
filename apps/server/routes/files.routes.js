import express from "express";
import Joi from "joi";
import { filesController } from "../controllers/filesController.js";
import { userAuth } from "../middleware/userAuth.js";
import { validate } from "../middleware/validate.js";

const router = express.Router();

const writeFileSchema = Joi.object({
  path: Joi.string().required(),
  content: Joi.string().required(),
  overwrite: Joi.boolean().optional(),
});

router.get("/tree", userAuth, filesController.getFileTree);
router.get("/read", userAuth, filesController.readWorkspaceFile);
router.post("/write", userAuth, validate(writeFileSchema), filesController.writeWorkspaceFile);
router.get("/search", userAuth, filesController.searchFiles);
router.post("/reveal", userAuth, filesController.revealFile);

export default router;
