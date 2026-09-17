import express from "express";
import equipmentRouter from "./equipment.js";
import integrationStatusRouter from "./integrationStatus.js";
import testRouter from "./test.js";
import inventoryRouter from "./inventory.js";

const router = express.Router();
router.use("/", integrationStatusRouter);
router.use("/", testRouter);
router.use("/", inventoryRouter);
router.use("/", equipmentRouter);

export default router;
