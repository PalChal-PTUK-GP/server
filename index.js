import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'
import { writeLog } from './utils/logs.js'
import jwt from 'jsonwebtoken'
import http from 'http'
import { initSocketIO } from './utils/socketIO.js'
import { initRoutes } from './routes/index.js'

const app = express();

// create raw http server instance because we need to pass it to socket.io and handle websocket connections
// and express server instance to handle http requests
// combine both instances to create a single server instance
const server = http.createServer(app);

dotenv.config();

const uploadDir = process.env.UPLOAD_DIR;

// connect to mongoDB
try {
    mongoose.connect(process.env.MONGO_DB_URI);
    mongoose.connection.setMaxListeners(20);
    console.log('MongoDB connected');
} catch (error) {
    console.log(error);
}

// middleware
app.use(cors({
    origin: "*",
    credentials: true, // allow credentials (cookies) to be sent with requests
}));
// app.use(express.json());
app.use((req, res, next) => {
    if (req.originalUrl === '/api/payments/webhook') {
        // Handle Stripe webhook events, since the body have to be raw and not parsed by express.json()
        // Match the raw body to content type application/json
        express.raw({ type: 'application/json' })(req, res, next);
    } else {
        express.json()(req, res, next);
    }
})
app.use(cookieParser());
app.use("/images", express.static(`${uploadDir}/images/`)); // allow access to the uploads folder

// Logging middleware - Ready Just uncomment to use
// app.use((req, res, next) => {
//     try {
//         const token = req.cookies.login_session || req.headers.authorization?.split(" ")[1];
//         const user = jwt.verify(token, process.env.JWT_SECRET);

//         writeLog(`${req.method} ${req.originalUrl} - IP: ${req.ip} - User: ${user.id} - Role: ${user.role}`);
//     } catch (err) {
//         writeLog(`${req.method} ${req.originalUrl} - ${req.ip} - User: Guest`);
//     } finally {
//         next();
//     }
// })

//routers middleware
initRoutes(app);


// Error Handling Middleware
app.use((err, req, res, next) => {
    console.log(err)
    const status = err.status ? err.status : 500;
    res.status(status).json({
        message: err.message || "Something Went Wrong",
        status
    })
})

initSocketIO(server); // initialize socket.io with the server instance

server.listen(process.env.SERVER_PORT, () => {
    console.log(`listening on port ${process.env.SERVER_PORT}!`);
});