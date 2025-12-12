const credentials = (req, res, next) => {
    const origin = req.headers.origin;

    // Allow any origin while still allowing credentials
    if (origin) {
        res.header("Access-Control-Allow-Origin", origin);
        res.header("Vary", "Origin");
        res.header("Access-Control-Allow-Credentials", "true");
    }

    next();
};

module.exports = credentials;


/*const allowedOrigins = [
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

module.exports = credentials;*/