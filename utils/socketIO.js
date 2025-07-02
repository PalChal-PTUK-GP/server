import { Server } from "socket.io";
import { createError, errorHandler } from "./index.js";
import jwt from 'jsonwebtoken';

const connectedUsers = new Map(); // to store the connected users and their socket IDs
let io;

export const initSocketIO = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // we should replace it with process.env.APP_URL in production
            methods: ["GET", "POST"],
            credentials: true
        }
    })

    // middleware to authenticate socket connection, ensure the user is logged in
    io.use((socket, next) => {
        // const token = socket.handshake.auth.token; // get token from socket auth from client side
        const token = socket.handshake.headers.token || socket.handshake.auth.token; // get token from socket headers
        try {
            if (!token) throw createError(401, 'Token Missing');
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.userId = decoded.id; // attach user ID to socket
            next();
        } catch (err) {
            errorHandler(err, next);
        }
    })


    io.on('connection', (socket) => {
        const userId = socket.userId;
        console.log(`🔐 Authenticated socket for user: ${userId}`);

        // Store the socket ID in the onlineUsers map
        connectedUsers.set(userId, socket.id);
        
        socket.broadcast.emit('userConnected', userId);
        
        // Listen for "isOnline" events
        socket.on("isOnline", (userId, callback) => {
            const isOnline = connectedUsers.has(userId);
            callback(isOnline); // send the response back to the client
        });


        // Listen for "isOnline" events
        socket.on("userDisconnected", (userId, callback) => {
            const isOnline = connectedUsers.has(userId);
            callback(isOnline); // send the response back to the client
        });


        // Listen for "isOnline" events
        socket.on("userConnected", (userId, callback) => {
            const isOnline = connectedUsers.has(userId);
            callback(isOnline); // send the response back to the client
        });


        socket.on('disconnect', () => {
            socket.broadcast.emit('userDisconnected', userId);
            connectedUsers.delete(userId);
            console.log(`❌ User ${userId} disconnected`);

        });
    })
}


export const sendNotificationToUser = (userId, notificaiton) => {
    const socketId = connectedUsers.get(userId);
    if (socketId) {
        io.to(socketId).emit('notification', notificaiton);
        console.log("Notification sent to user: ", userId);
    }
}


export const sendMessageToUser = (userId, message) => {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
        io.to(socketId).emit('message', message);
        console.log("Message sent to user: ");
    }
}