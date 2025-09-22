import { NextFunction, Request, Response, Router } from "express";
import { userService } from "../services/userService.js";
import { User } from "../entities/User.js";
import { superAdminRequired } from "../middleware/authMiddleware.js";

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

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id || "";
    const userData = req.body as User;
    const user = await userService.updateUser({ ...userData, id: userId });
    res.json({ payload: { user } });
  } catch (error) {
    next(error);
  }
});


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
