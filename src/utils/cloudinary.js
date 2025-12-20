import {v2 as cloudinary} from "cloudinary";
import fs from "fs";

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

                return response;
        }
        catch(error){
            fs.unlinkSync(localfilepath)  // removes the locally saved temporary files as the upload operation fails
            return null;
        }
    }

    export {uploadOnCloudinary} ; 