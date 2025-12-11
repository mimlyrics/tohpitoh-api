const allowedOrigins = [
    'http://localhost:3000',
    'https://mimlyricstest2.api.onrender.com',
    'https://mimlyricstest5.onrender.com'
];
const credentials = (req, res, next) => {
    const origin = req.headers.origin;
    if(allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Credentials',true);
    }
    next();
}

module.exports = credentials;