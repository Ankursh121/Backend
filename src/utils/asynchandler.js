// For production level good practice by using promises // 

const asynchandler = (requestHandler) => {
    (req,res,next) => {
        Promise.resolve(requestHandler(req,res,next)).catch((error) => next (error)) ; 
    }
};



    
export {asynchandler};



// Easier way by using try and catch 

/*
const asyncHandler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    res.status(error.code || 500).json({
      success: false,
      message: error.message,
    });
  }
};

*/
