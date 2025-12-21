import { ApiError } from "../utils/ApiError";
import { asynchandler } from "../utils/asynchandler";
import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";


const verifyJWT = asynchandler(async (req , _ , next) => {

   try {
    const token = req.cookies?.AccessToken || header ("Authorization")?.replace("Bearer " , "");
 
    if(!token) {
     throw new ApiError(402 , "Unauthorized request!");
    }
 
    const decodedtoken = jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
 
    const user = await User.findById(decodedtoken?._id).select("-password -refreshToken")
 
    if(!user){
     throw new ApiError(401 , "Invalid access token")
    }
 
    req.user = user;
    next()

   } catch (error) {
        throw new ApiError(401 , "Invalid access token!")
   }

})






export {verifyJWT};