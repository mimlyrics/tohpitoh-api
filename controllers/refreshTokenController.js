const User = require("../models/User");
const jwt = require('jsonwebtoken');
const {generateAccessToken, generateToken} = require("../utils/generate-token");
const asyncHandler = require('express-async-handler');
const handleRefreshToken = async (req, res) => {
    const cookies = req.cookies;
    console.log("cookies: ", cookies);
    console.log("HEYY");
    if(!cookies?.jwt) { return res.status(401).json({message: 'no cookie'});}
    console.log(cookies.jwt);
    const refreshToken = cookies.jwt;

    // delete the cookie ***
    res.clearCookie('jwt', {httpOnly: true, sameSite: 'None', secure: true});

    // find user
    const user = await User.findOne({refreshToken: refreshToken});
    console.log(user);

    //Detected refresh token reuse !
    if(!user) { 
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        const hackedUser = await User.findOne({_id: decoded.userId}).exec();
        if(hackedUser) {
            hackedUser.refreshToken = [];
            const result = await hackedUser.save();
        }else {
            return res.status(401).json({message: 'Unauthorized'});
        }
    }

    const newRefreshTokenArray = user.refreshToken.filter(rt => rt !== refreshToken);

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log(decoded.userId);
    if(user._id == decoded.userId) {
        console.log("yep");
        // refresh token was still valid;
        const accessToken = generateAccessToken(res, user._id, user.role);
        const newRefreshToken = generateToken(res, user._id, user.role);
        user.refreshToken = [...newRefreshTokenArray, newRefreshToken];
        // creates secure cookie
        res.cookie('jwt', newRefreshToken, {httpOnly: true, sameSite: 'None', secure: true});
        
        return res.status(201).json({accessToken});

    }else {
        user.refreshToken = [...newRefreshTokenArray];
        const result = await user.save();
        console.log(result);
    }
}

module.exports = {handleRefreshToken};