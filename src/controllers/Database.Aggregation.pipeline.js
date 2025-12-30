import { Collection } from "mongoose";
import { User } from "../models/user.models.js";


User.aggregate([             // First thing to remember is that it stores the whole thing in array format

    {                        // Each curly bracket inside this array is a different pipeline 
        $lookup : {
            from : "authors",
            localField : "author_id",
            foreignField : "_id",
            as : "author_details"
        }
    },
    {
        $addFields : {
            author_details : {
                $arrayElemAt : ["$author_details" , 0]
            }
        }
    }
])  