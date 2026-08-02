import { Router, type IRouter } from "express";
import { recaptchaConfig } from "../lib/recaptcha";

const router: IRouter = Router();

// GET /config — public configuration consumed by the frontend
router.get("/config", (_req, res): void => {
  res.json({
    recaptcha: {
      siteKey: recaptchaConfig.siteKey,
      loginEnabled: recaptchaConfig.loginEnabled,
      registerEnabled: recaptchaConfig.registerEnabled,
    },
  });
});

export default router;
