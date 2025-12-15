const jwt = require("jsonwebtoken");

const generateToken = (res, userId, role) => {
    const refreshToken = jwt.sign({userId, role}, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "30d" 
    })
    console.log(refreshToken);
    return refreshToken;
}

const generateAccessToken = (res, userId, role) => {
    console.log("role: ", role);
    const accessToken = jwt.sign({userId, role}, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "15d" 
    })
    return accessToken;
}


module.exports = {generateToken, generateAccessToken};