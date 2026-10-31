import express from "express";
import { modelsController } from "../controllers/modelsController.js";

const router = express.Router();

router.get("/models", modelsController.getModels);
router.get("/model/options", modelsController.getModelOptions);

export default router;
