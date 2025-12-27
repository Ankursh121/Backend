import { Router } from "express";
import { LoginUser, registerUser, LogoutUser, refreshAccessToken, updateAccountDetails, UpdateUserAvatar, changeCurrentPassword, getCurrentUser, UpdateUserCoverimage, getUserChannelprofile, getwatchHistory } from "../controllers/user.controllers.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverimage",
            maxCount: 1
        }
    ]), registerUser)


router.route("/login").post(LoginUser)

// secured routes - 

router.route("/logout").post(verifyJWT, LogoutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT, changeCurrentPassword)
router.route("/current-user").post(verifyJWT, getCurrentUser)
router.route("/update-acc-details").patch(verifyJWT, updateAccountDetails) // patch is written it is imp 
router.route("/avatar-update").patch(verifyJWT, upload.single("avatar"), UpdateUserAvatar)
router.route("/coverimage-update").patch(verifyJWT, upload.single("coverimage"), UpdateUserCoverimage)
router.route("/c/:username").get(verifyJWT, getUserChannelprofile)
router.route("/history").get(verifyJWT, getwatchHistory)

export default router;