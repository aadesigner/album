import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import configRouter from "./config";
import categoriesRouter from "./categories";
import templatesRouter from "./templates";
import settingsRouter from "./settings";
import projectsRouter from "./projects";
import ordersRouter from "./orders";
import uploadsRouter from "./uploads";
import adminRouter from "./admin";
import geoRouter from "./geo";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(configRouter);
router.use(categoriesRouter);
router.use(templatesRouter);
router.use(settingsRouter);
router.use(projectsRouter);
router.use(ordersRouter);
router.use(uploadsRouter);
router.use(adminRouter);
router.use(geoRouter);
router.use(analyticsRouter);

export default router;
