import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import cookieParser from 'cookie-parser'

import PaymentsRoute from './routes/payments.js'
import UsersRoute from './routes/users.js'
import ReservationRoute from './routes/reservations.js'
import PropertiesRoute from './routes/properties.js'
import AuthRoute from './routes/auth.js'
import citiesRoute from './routes/cities.js'
import regionsRoute from './routes/regions.js'
import amenitiesRoute from './routes/amenities.js'
import reviewsRoute from './routes/reviews.js'
import WishListRoute from './routes/wishlist.js'
import MessagesRoute from './routes/messages.js'
import ConversationsRoute from './routes/conversations.js'
import NotificationRoute from './routes/notifications.js'
import ReportsRoute from './routes/reports.js'
import HostRequestsRoute from './routes/hostRequests.js'
import adminRoute from './routes/admin.js'
import { writeLog } from './utils/logs.js'
import jwt from 'jsonwebtoken'
import http from 'http'
import { initSocketIO } from './utils/socketIO.js'

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
app.use((req, res, next) => {
    // try {
    //     const token = req.cookies.login_session || req.headers.authorization?.split(" ")[1];
    //     const user = jwt.verify(token, process.env.JWT_SECRET);

    //     writeLog(`${req.method} ${req.originalUrl} - IP: ${req.ip} - User: ${user.id} - Role: ${user.role}`);
    // } catch (err) {
    //     writeLog(`${req.method} ${req.originalUrl} - ${req.ip} - User: Guest`);
    // } finally {
    //     next();
    // }
})

//routers middleware
app.use('/api/users', UsersRoute);
app.use('/api/properties', PropertiesRoute);

app.use('/api/cities', citiesRoute);
app.use('/api/regions', regionsRoute);
app.use('/api/amenities', amenitiesRoute);
app.use('/api/reviews', reviewsRoute);
app.use('/api/wishlist', WishListRoute);

app.use('/api/payments', PaymentsRoute);
app.use('/api/reservations', ReservationRoute);
app.use("/api/auth", AuthRoute);

app.use('/api/messages', MessagesRoute);
app.use('/api/conversations', ConversationsRoute);
app.use('/api/notifications', NotificationRoute);

app.use("/api/reports", ReportsRoute);
app.use('/api/hostRequests', HostRequestsRoute);
app.use('/api/admin', adminRoute);

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