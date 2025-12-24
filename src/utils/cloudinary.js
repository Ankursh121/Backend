import {v2 as cloudinary} from "cloudinary";
import fs from "fs";
import { ApiError } from "./ApiError.js";

cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME , 
        api_key: process.env.CLOUDINARY_CLOUD_API_KEY, 
        api_secret: process.env.CLOUDINARY_CLOUD_API_SECRET,
    });

    const uploadOnCloudinary = async (localfilepath) => {
        try{
            if(!localfilepath) return console.log("File path is not there");

                const response = await cloudinary.uploader.upload(localfilepath , {
                    resource_type: "auto"
                })

                console.log("File is Uploaded on Cloudinary" , response.url);
                fs.unlinkSync(localfilepath);

                return response;
        }
        catch(error){
            fs.unlinkSync(localfilepath)  // removes the locally saved temporary files as the upload operation fails
            return null;
        }
    }

   const DeleteOnCloudinary = async (fileUrl) => {
  try {
    if (!fileUrl) {
      console.log("Avatar Not Found");
      return null;
    }
    const parts = fileUrl.split("/");
    const publicId = parts[parts.length - 1].split(".")[0];
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.log("Error Deleting From Cloudinary");
    return null;
  }
};


    export {uploadOnCloudinary , DeleteOnCloudinary} ; 