import { Video } from "../models/video.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asynchandler } from "../utils/asynchandler.js";
import mongoose , {isValidObjectId} from "mongoose";
import { DeleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.models.js";

const getAllVideos = asynchandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query
    //TODO: get all videos based on query, sort, pagination
    
    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const matchstage = {isPublished : true};  // this means that it Only include videos where isPublished is true 

    if(query){
        matchstage.$or = [          // $or is a logical OR operation here it gets the true value in return either from title or description 
            {title : {$regex : query , $options: "i"}},        // $regex is a smart search which searches the query and $options helps it to ignore the spaces "i" = spaces .
            {description : {$regex : query , $options: "i"}}
        ]
    }

    // Filtering - 
    if(userId && isValidObjectId(userId)){
        matchstage.owner = new mongoose.Types.ObjectId(userId);
    }

    //Sorting - 

    const sortStage = {
  [sortBy]: sortType === "asc" ? 1 : -1,
};

const videos = await Video.aggregate([
    {
        $match : matchstage
    },
    {
        $lookup:{
            from : "users",
            localField : "owner",
            foreignField : "_id",
            as : "owner"
        }
    },
    {
        $unwind : "$owner"
    },
    {
        $project : {
            "owner.Password":0,
            "owner.refreshtoken":0
        }
    },

    {$sort : sortStage},
    {$skip : skip},
    {$limit : limit}
])

// total videos count 
 const totalVideos = await Video.countDocuments(matchstage);

  /* ---------------- RESPONSE ---------------- */
  return res.status(200).json(
    new ApiResponse(
      200,
      {
        videos,
        pagination: {
          totalVideos,
          currentPage: page,
          totalPages: Math.ceil(totalVideos / limit),
          limit,
        },
      },
      "Videos fetched successfully"
    ))

})

const publishAVideo = asynchandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video

    const VIDEOlocalpath = req.files?.videoFile[0].path;
    const THUMBNAILlocalpath = req.files?.thumbnail[0].path;

    if(!title || !description){
        throw new ApiError(400 , "Title and Description are Required");
    }

    if(!VIDEOlocalpath){
        throw new ApiError(400 , "Video is Required!");
    }

    const VIDEO = await uploadOnCloudinary(VIDEOlocalpath);

    if(!THUMBNAILlocalpath){
        throw new ApiError(400 , "Thumbnail is required!");
    }

    const THUMBNAIL = await uploadOnCloudinary(THUMBNAILlocalpath);

    if(!VIDEO || !THUMBNAIL){
        throw new ApiError(400 , "These are Required");
    }

    const video = await Video.create({
        videoFile : VIDEO?.url,
        thumbnail : THUMBNAIL?.url,
        title, 
        description,
        duration : VIDEO.duration,
        owner : req.user._id
    })

    return res.status(200).json(new ApiResponse(201 , video , "Video Published Successfully"));
})

const getVideoById = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: get video by id
    
    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "videoId not found");
    }

    await Video.findByIdAndUpdate(
        videoId,
        [
            {
                $set: {
                    views: {
                        $cond: {
                            if: { $isArray: "$views" },
                            then: "$views",
                            else: []
                        }
                    }
                }
            }
        ],
        {updatePipeline : true}
    );

    await Promise.all([           // this promise.all helps in parallel DB updates and it is faster than sequential await
        Video.findByIdAndUpdate(
            videoId,
            {
                $addToSet : {views : req.user._id}
            }
        ),

        User.findByIdAndUpdate(
            req.user._id,
            {
                $addToSet : {watchHistory : videoId}
            }
        )
    ])

    const video = await Video.aggregate([
        {
            $match : {_id : new mongoose.Types.ObjectId(videoId)}
        },
        {
            $lookup : {
                from : "likes",
                localField : "_id",
                foreignField : "video",
                as : "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "channel"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "owner",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        { $unwind: "$channel" },
        {
            $addFields: {
                likesCount: { $size: "$likes" },
                views: { $size: "$views" },
                "channel.subscribersCount": { $size: "$subscribers" },
                "channel.isSubscribed": {
                    $in: [
                        new mongoose.Types.ObjectId(req.user._id),
                        "$subscribers.subscriber"
                    ]
                }
            }
        },
        {
            $project: {
                "channel._id": 1,
                "channel.avatar": 1,
                "channel.fullName": 1,
                "channel.username": 1,
                "channel.subscribersCount": 1,
                "channel.isSubscribed": 1,

                title: 1,
                description: 1,
                videoFile: 1,
                duration: 1,
                views: 1,
                likesCount: 1,
                isPublished: 1,
                createdAt: 1
            }
        }
    ])

    if (!video.length) {
        throw new ApiError(404, "Video not found");
    }

    return res.status(200).json(
        new ApiResponse(200, video[0], "Video Details Fetched Successfully")
    );
    
})

const updateVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Not a valid video ID");
    }

    const oldvideo = await Video.findById(videoId);
    if (!oldvideo) {
        throw new ApiError(404, "Video not found");
    }

    // Authorization
    if (oldvideo.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You cannot update the video");
    }

    const updatequery = {};

    if (title) updatequery.title = title;
    if (description) updatequery.description = description;

    const thumbnaillocalpath = req.file?.path;

    if (thumbnaillocalpath) {
        const newThumbnail = await uploadOnCloudinary(thumbnaillocalpath);
        if (!newThumbnail) {
            throw new ApiError(500, "Thumbnail upload failed");
        }

        await DeleteOnCloudinary(oldvideo.thumbnailPublicId);

        updatequery.thumbnail = newThumbnail.url;
        updatequery.thumbnailPublicId = newThumbnail.public_id;
    }

    const updatedvideo = await Video.findByIdAndUpdate(
        videoId,
        { $set: updatequery },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new ApiResponse(200, updatedvideo, "Video details updated successfully")
        );
});


const deleteVideo = asynchandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "not a valid id");
    }

    const oldvideo = await Video.findById(videoId);

    if (!oldvideo) {
        throw new ApiError(404, "Video not found");
    }

    if (oldvideo.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this video");
}

    await DeleteOnCloudinary(oldvideo.videoFilepublic_id);
    await DeleteOnCloudinary(oldvideo.thumbnailPublicId);

    await Video.findByIdAndDelete(videoId);

    return res.status(200).json(new ApiResponse(200 , null , "Video Deleted Succsessfully"));
})

const togglePublishStatus = asynchandler(async (req, res) => {
    const { videoId } = req.params;

    if(!isValidObjectId(videoId)){
        throw new ApiError(400 , "not a valid id");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Authorization check
    if (video.owner.toString() !== req.user._id.toString()) {
        throw new ApiError(403, "You are not allowed to change publish status");
    }

    const updateVIDEO = await Video.findByIdAndUpdate(
        videoId ,
        {
            $set : {
                isPublished : !(video.isPublished)
            }
        },
        {new : true}
    )

    return res.status(200).json(new ApiResponse(200 , updateVIDEO , "Publish status toggled successfully"));
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}