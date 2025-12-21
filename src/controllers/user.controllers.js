import { asynchandler } from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";




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

const {fullname , username , email , password} = req.body;


// Validaton check code - 
if(
    [fullname , username , email , password].some((field) => field?.trim() === "" )
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

  if(!username || !email){
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

  return res.status()
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

 




export {registerUser , LoginUser , LogoutUser} ; 