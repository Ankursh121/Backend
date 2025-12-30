import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.models.js"
import { Subscription } from "../models/subscriptions.models.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import { asynchandler } from "../utils/asynchandler.js"


const toggleSubscription = asynchandler(async (req, res) => {
    const {channelId} = req.params
    const subscriberId = req.user?._id

    if(!isValidObjectId(channelId)){
        throw new ApiError(400 , "Invalid Channel Id!");
    }

    if(subscriberId.toString() === channelId){
        throw new ApiError(401 , "You cannot Subscribe to Yourself!")
    }

    const existingSubscription = await Subscription.findOne({
        subscriber : subscriberId,
        channel : channelId
    })

    if(existingSubscription){
        await Subscription.deleteOne({       // Already Subscribed So removing the Subscription
            _id : existingSubscription._id
        })

        return res.status(200).json(new ApiResponse(201 , {isSubscribed : false} , "Unsubscribed Successfully"))
    }

        await Subscription.create({         // For Subscribing 
            subscriber : subscriberId,
            channel : channelId
        })

    return res.status(200).json(new ApiResponse(201 , {isSubscribed : true} , "Subscribed Successfully"))
})



const getUserChannelSubscribers = asynchandler(async (req, res) => {
    const {channelId} = req.params

    if(!isValidObjectId(channelId)){
        throw new ApiError(405 , "Invalid Channel id")
    }

    const subscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
      }
    },
    { $unwind: "$subscriber" },
    {
      $project: {
        _id: 0,
        "subscriber.password": 0,
        "subscriber.refreshToken": 0,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, subscribers, "Subscribers fetched successfully")
  );

})


// controller to return channel list to which user has subscribed
const getSubscribedChannels = asynchandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber id");
  }

  const channels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
      },
    },
    { $unwind: "$channel" },
    {
      $project: {
        _id: 0,
        "channel.password": 0,
        "channel.refreshToken": 0,
      },
    },
  ]);

  return res.status(200).json(
    new ApiResponse(200, channels, "Subscribed channels fetched successfully")
  );

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}