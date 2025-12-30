import { Router } from "express";
import { getAllVideos,getVideoById,publishAVideo,togglePublishStatus,updateVideo,deleteVideo } from "../controllers/Video.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/").get(getAllVideos).post(upload.fields([
    {
        name : "videoFile",
        maxCount : 1
    },
    {
        name : "thumbnail",
        maxCount : 1
    }
    ]), verifyJWT , publishAVideo
    )

    router.use(verifyJWT) // now this will be applied to all below

    router.route("/:videoId").get(getVideoById)

    router.route("/:videoId").delete(deleteVideo).patch(upload.single("thumbnail"), updateVideo);

    router.route("/delete/:videoId").delete(deleteVideo);
    
    router.route("/toggle/publish/:videoId").patch(togglePublishStatus);

export default router;