import express from "express";
import { gitController } from "../controllers/gitController.js";
import { userAuth } from "../middleware/userAuth.js";

const router = express.Router();

router.get("/status", userAuth, gitController.getGitStatus);
router.get("/diff", userAuth, gitController.getGitDiff);
router.get("/branches", userAuth, gitController.getGitBranches);
router.post("/branch/switch", userAuth, gitController.switchGitBranch);
router.post("/stage", userAuth, gitController.stageGitFile);
router.post("/unstage", userAuth, gitController.unstageGitFile);
router.post("/discard", userAuth, gitController.discardGitChanges);
router.post("/commit", userAuth, gitController.commitGitChanges);
router.get("/worktrees", userAuth, gitController.getGitWorktrees);
router.post("/worktree/add", userAuth, gitController.addGitWorktree);
router.post("/worktree/remove", userAuth, gitController.removeGitWorktree);

export default router;
