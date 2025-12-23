import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"



// Access token and Refresh Token - 

 const generateAccessandRefreshToken = async(userId) => {
    try {
        const user = await User.findById(userId)
        const AccessToken = user.generateAccessToken()
        const RefreshToken = user.generateRefreshToken()

        user.RefreshToken = RefreshToken
        await user.save({validateBeforeSave : false})

        return {AccessToken , RefreshToken}

    } catch (error) {
        throw new ApiError(500 , "something went wrong while generating the access and refresh tokens")
    }
 }




const registerUser = asynchandler(async (req , res) => {
// steps of all the work we are going to do // 
// get user details from frontend
// validation - not empty 
// check if user already exists: username, email
// check for images, check for avatar
// upload them to cloudinary, avatar
// create user object - create entry in db
// remove password and refresh token field from response
// check for user creation
// return res

const {fullname , username , email , password} = req.body; // req.body holds the data sent from the user   
                                                                     // (from postman ,frontend etc)


// Validaton check code - 
if(
    [fullname , username , email , password].some((field) => field?.trim() === "" ) // .some() returns true → if at least one element satisfies the condition
                                                                                                    // false → if none satisfy it
) {
    throw new ApiError(400 , "All fields are Required!");
}

// This is old and lengthy mehthod (but no problem in this perfect code);
/*
if(fullname === ""){
    throw new ApiError(400 , "full name is required!")
}
if(username === ""){
    throw new ApiError(400 , "username is required!")
}
if(email === ""){
    throw new ApiError(400 , "email is required!")
}
if(password === ""){
    throw new ApiError(400 , "Password is required!")
}
*/

// Checking if user already exits - 

const existedUser = await User.findOne({      // User.findOne is the mongoose method which searches in database
    $or : [{ username } , { email }]
}) 

if (existedUser) {
    throw new ApiError(409 , "User with this email or username Already Exists");
}


// checking for images, avatars and files - 

  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverimageLocalPath = req.files?.coverimage[0]?.path;


  if(!avatarLocalPath){
    throw new ApiError(400 , "Avatar File is Required");
  }


// Uploading the file from localPath to Cloudinary - 

 const avatar = await uploadOnCloudinary(avatarLocalPath);
 // const coverimage = await uploadOnCloudinary(coverimageLocalPath);
 
 // in case when coverimage is optional - 
 let coverimage;
  if (coverimageLocalPath) {
    coverimage = await uploadOnCloudinary(coverimageLocalPath);
  }

 if(!avatar){
    throw new ApiError(400 , "Avatar is required");
 }

 // Creating the user object and entering in Database - 

 const user = await User.create({
    fullname,
    avatar : avatar.url,
    coverimage : coverimage?.url || "" , // Doing this bcz we havent checked if there is some error in coverimage above 
    email,
    password,
    username : username.toLowerCase(),

 })

 // checking for object creation and removing password and refresh token from response - 

 const createdusercheck = await User.findById(user._id).select(
    "-password -refreshToken"
 )

 if(!createdusercheck){
    throw new ApiError(500 , "Something went wrong while registering a user");
 }

 // Returning the response by using ApiResponse file - 

 return res.status(201).json(
    new ApiResponse(200 , createdusercheck , "User Registered Successfully")
 )


 })




 const LoginUser = asynchandler(async(req , res) => {
// req body -> data
// username or email
// find the user
// password check
// access and refresh token
// send cookie
// return response 

// Request body se data lana - 

  const {username, email, password} = req.body

  if(!(username || email)){
    throw new ApiError(400 , "Username or Email is Required!")
  }

  //find the user using username or email - 

  const user = await User.findOne({
    $or: [{username} , {email}]
  })

  if(!user) {
    throw new ApiError(404 , "User not found!")
  }

  // Password checking 

  const ispasswordValid = user.ispasswordCorrect(password);

  if(!ispasswordValid){
    throw ApiError(401 , "Password not correct!")
  }

  const {AccessToken , RefreshToken} = await generateAccessandRefreshToken(user._id)

  const loggedinUser = await User.findById(User._id).select("-password -refreshToken") // With this we can select that what things we dont want to send to the user!
  
  // cookie sending - 

  const options = {
    httpOnly : true,
    secure : true
  }

  return res.status(200)
  .cookie("AccessToken" , AccessToken , options)
  .cookie("RefreshToken" , RefreshToken , options)
  .json (
    new ApiResponse(200 , {
        user:loggedinUser, AccessToken , RefreshToken
    }), "User logged in Successfully"
  )

 })


 // Logout user - 

 const LogoutUser = asynchandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id , {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
    httpOnly : true,
    secure : true
  }

  return res.status(200)
         .clearCookie("AccessToken" , options)
         .clearCookie("RefreshToken" , options)
         .json(new ApiResponse(200 , {} , "User Logged out Successfully"))

 })

 

 const refreshAccessToken =  asynchandler(async(req , res) => {
       const incomingRefreshToken =  req.cookies.refreshToken || req.body.refreshToken;

       if(incomingRefreshToken){
        throw new ApiError(401 , "Unauthorized request");
       }

       try {
        const decodedtoken = jwt.verify(incomingRefreshToken , process.env.REFRESH_TOKEN_SECRET);
 
        const user = await User.findById(decodedtoken?._id)
 
        if(!user){
         throw new ApiError(402 , "Invalid Refresh Token");
        }
 
        if(!incomingRefreshToken !== user?.refreshToken){
         throw new ApiError(400 , "Refresh Token is Expired or used");
        }
 
        const options = {
         httpsOnly: true ,
         secure : true
        }
 
        const {AccessToken , newrefreshToken} = await generateAccessandRefreshToken(user._id)
 
 
        return res.status(200)
        .cookie("accessToken" , AccessToken , options)
        .cookie("refreshToken" , newrefreshToken , options)
        .json(
         new ApiResponse(200 , {AccessToken , refreshToken : newrefreshToken} , "Access Token Refreshed" )
        )
       } catch (error) {
         throw new ApiError(400 , error?.message || "Invalid");
       }

 })


 const changeCurrentPassword = asynchandler(async (req , res) =>{

  const {oldPassword , newPassword , confirmPassword} = req.body;

  if(!(newPassword === confirmPassword)){
    throw new ApiError(405 , "The new Password should be same as Confirm Password")
  }

  const user = User.findById(user._id);

  const ispassCorrect = await user.ispasswordCorrect(oldPassword);

  if(!ispassCorrect){
    throw new ApiError(400 , "Invalid Password");
  }

  user.password = newPassword;
  await user.save({validateBeforeSave : false});

  return res.status(200)
  .json(new ApiResponse(200 , {} , "Password Changed Successfully"))
 })



 const getCurrentUser = asynchandler(async(req , res) => {
  return res.status(200).json(200 , req.user , "Current User Fetched Successfully")
 })



 const updateAccountDetails  = asynchandler(async(req , res) => {
  
  const {fullname , email} = req.body;
  if(!fullname || !email){
    throw  new ApiError(401 , "All fields are Required");
  }

  const user = User.findByIdAndUpdate(req.user?._id,
    {
      $set : {
        fullname : fullname,
        email : email
      }
    },
    {new : true}
  ).select("-password")

  return res.status(200).json(new ApiResponse(200 , user , "Account details Updated Successfully"))

 })


 const UpdateUserAvatar = asynchandler(async (req , res) => {
  const avatarlocalpath = req.file?.path

  if(!avatarlocalpath){
    throw new ApiError(400 , "Avatar file is Missing")
  }

  const avatar = await uploadOnCloudinary(avatarlocalpath)

  if(!avatar.url){
    throw new ApiError(400 , "Error while Uploading on avatar")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set : {
        avatar : avatar.url
      }
    },
    {new:true}
  ).select("-password")

return res.status(200).json(new ApiResponse(200 , user , "Avatar Updated Successfully"))

 })




 const UpdateUserCoverimage = asynchandler(async (req , res) => {
  const Coverimagelocalpath = req.file?.path

  if(!Coverimagelocalpath){
    throw new ApiError(400 , "Coverimage file is Missing")
  }

  const coverimage = await uploadOnCloudinary(Coverimagelocalpath)

  if(!coverimage.url){
    throw new ApiError(400 , "Error while Uploading on Coverimage")
  }

  const user = await User.findByIdAndUpdate(req.user?._id,
    {
      $set : {
        coverimage : coverimage.url
      }
    },
    {new:true}
  ).select("-password")

return res.status(200).json(new ApiResponse(200 , user , "Coverimage Updated Successfully"))

 })




export {registerUser , LoginUser , LogoutUser , refreshAccessToken , changeCurrentPassword,
        getCurrentUser , updateAccountDetails , UpdateUserAvatar , UpdateUserCoverimage} ; 