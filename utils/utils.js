const jwt = require("jsonwebtoken");
const generateEmailToken = (email) => {
    const emailToken = jwt.sign({email}, process.env.EMAIL_TOKEN_SECRET, {expiresIn: '1h'});
    return emailToken;   
}


const generateEmailCode = () => {
    let min = 100000;
    let max = 999999;

    const code = Math.floor(Math.random()* min) + (max-min)
    return code;
}

function generateCode() {
    min = 100000
    max = 999999
    const randomNumber = Math.floor(Math.random()* (max-min) + 1) + min;
    return randomNumber;
}

module.exports = {generateEmailToken, generateEmailCode, generateCode} 