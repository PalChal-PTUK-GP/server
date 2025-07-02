import express from "express";
import { createError, errorHandler, verifyUser } from "../utils/utils.js";
import Message from "../models/Message.js";
import Conversation from "../models/Conversation.js";
import { sendMessageToUser } from "../utils/socketIO.js";

const LIMIT = 5 * 60 * 1000; // 10 minutes in milliseconds

const router = express.Router();

/**
 * * @description Create a new message in a conversation
 * * @route POST /api/messages
 * * @access Public
 * * @param {string} conversationId - The ID of the conversation to send the message in
 * * @param {string} text - The text of the message
 */
router.post("/", verifyUser, async (req, res, next) => {
    const { conversationId, text } = req.body;
    const senderId = req.user.id;

    try {
        if (!conversationId || !text) {
            throw createError(400, "Conversation ID and text are required")
        }

        if(text.trim().length === 0){
            throw createError(400, "Message text cannot be empty")
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw createError(404, "Conversation not found")
        }

        if (!conversation.members.includes(senderId)) {
            throw createError(403, "You are not a member of this conversation")
        }

        const newMessage = new Message({
            senderId,
            conversationId,
            text
        });

        await newMessage.save();

        conversation.lastMessage = newMessage._id; // Update the last message in the conversation
        await conversation.save();

        conversation.members.forEach((memberId) => {
            if (memberId.toString() !== senderId) {
                sendMessageToUser(memberId, newMessage);
            }
        });

        res.status(200).json(newMessage);
    } catch (err) {
        errorHandler(err, next);
    }

});

/**
 * * @description Get all messages in a conversation
 * * @route GET /api/messages/:conversationId
 * * @access Public
 * * @param {string} conversationId - The ID of the conversation to get messages from
 */
router.get("/:conversationId/all", verifyUser, async (req, res, next) => {
    const { conversationId } = req.params;
    const senderId = req.user.id;

    const page = parseInt(req.query.page) || 1; // Get the page number from query params, default to 1
    const limit = parseInt(req.query.limit) || 10; // Get the limit from query params, default to 10
    const skip = (page - 1) * limit; // Calculate the number of messages to skip

    try {
        if (!conversationId) {
            throw createError(400, "Conversation ID is required")
        }

        const conversation = await Conversation.findById(conversationId);

        if (!conversation) {
            throw createError(404, "Conversation not found")
        }

        if (!conversation.members.includes(senderId)) {
            throw createError(403, "You are not a member of this conversation")
        }

        const messages = await Message.find({ conversationId }).sort({ createdAt: -1 }).skip(skip).limit(limit)

        res.status(200).json(messages.reverse());
    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * * @description set a message as seen
 * * @route PUT /api/messages/:id/seen
 * * @access Public
 * * @param {string} id - The ID of the message to set as seen
 */

router.put('/:id/seen', verifyUser, async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        if (!id) {
            throw createError(400, "Message ID is required")
        }

        const message = await Message.findById(id);
        const conversation = await Conversation.findById(message.conversationId);

        if (!message) {
            throw createError(404, "Message not found")
        }

        if (!conversation.members.includes(userId) || message.senderId.toString() === userId) {
            throw createError(403, "You Can't set this message as seen")
        }

        message.seen = true;
        await message.save();

        res.status(200).json({ message: "Message seen successfully", message });
    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * 
 */

router.get('/unseenCount', verifyUser, async (req, res, next) => {
    try {
        const userId = req.user.id;

        let conversations = await Conversation.find({ members: { $in: [userId] } }).populate('lastMessage');

        let data = conversations.filter((conversation) => {
            return conversation.lastMessage && conversation.lastMessage.senderId.toString() !== userId && !conversation.lastMessage.seen
        })

        res.status(200).json({ count: data.length });

    } catch (err) {
        errorHandler(err, next);
    }

});


export default router;