import { NextFunction, Request, Response, Router } from "express";
import { userService } from "../services/userService.js";
import { User } from "../entities/User.js";
import { loginRequired, superAdminRequired } from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/",
  [superAdminRequired],
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { users, count } = await userService.getUsers();

      res.json({ payload: { users, count } });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  [loginRequired],
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authenticatedUserId = req.user?.id;

      if (!authenticatedUserId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const updates: Partial<User> = { id: authenticatedUserId };

      if (typeof req.body.fullName === "string") {
        updates.fullName = req.body.fullName.trim();
      }

      if (typeof req.body.phoneNumber === "string") {
        updates.phoneNumber = req.body.phoneNumber.trim();
      }

      if (Object.keys(updates).length === 1) {
        res.status(400).json({ error: "No updatable fields provided" });
        return;
      }

      const user = await userService.updateUser(updates);
      res.json({ payload: { user } });
    } catch (error) {
      next(error);
    }
  },
);


router.get(
  "/:userId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById({
        userId,
      });

      res.json({ payload: { user } });
    } catch (error) {
      next(error);
    }
  },
);

export { router as userRouter };
