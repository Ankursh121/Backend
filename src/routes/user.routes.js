import { Router } from "express";
import { LoginUser, registerUser , LogoutUser , refreshAccessToken, updateAccountDetails, UpdateUserAvatar } from "../controllers/user.controllers.js";
import {upload} from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router();


router.route("/register").post(
    upload.fields([
        {
            name : "avatar",
            maxCount: 1
        },
        {
            name : "coverimage",
            maxCount: 1
        }
    ]) , registerUser)


    router.route("/login").post(LoginUser)

    // secured routes - 

    router.route("/logout").post(verifyJWT , LogoutUser)
    router.route("/refresh-token").post(refreshAccessToken)
    router.route("/avatar-update").post(verifyJWT , upload.single("avatar"), UpdateUserAvatar)

export default router;