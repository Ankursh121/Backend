import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


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

const {fullname , username , email , password} = req.body;


// Validaton check code - 
if(
    [fullname , username , email , password].some((field) => field?.trim() === "" )
) {
    throw new ApiError(400 , "All fields are Required!");
}

// Checking if user already exits - 

const existedUser = await User.findOne({
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
 const coverimage = await uploadOnCloudinary(coverimageLocalPath);

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



export {registerUser} ; 