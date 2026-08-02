import { type User } from "@workspace/db-tsconfig";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
