import express from "express";
import { upload } from "../config/cloudinary.config.js";
import {
    createFacility,
    createSlider,
    deleteFacility,
    deleteSlider,
    getFacilities,
    getSliders,
    requiredPermission,
    toggleSlider,
    updateFacility,
    updateSlider,
} from "../controllers/sliders.js";
import { authMiddleware, checkPermission } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/sliders", getSliders);
router.get("/facilities", getFacilities);


router.use(authMiddleware, checkPermission(requiredPermission));

router.post("/sliders", upload.single("image"), createSlider);
router.put("/sliders/:id", upload.single("image"), updateSlider);
router.delete("/sliders/:id", deleteSlider);
router.patch("/sliders/:id/toggle", toggleSlider);

router.post("/facilities", upload.single("image"), createFacility);
router.put("/facilities/:id", upload.single("image"), updateFacility);
router.delete("/facilities/:id", deleteFacility);

export default router;
