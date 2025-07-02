import express from "express";
import { createError, errorHandler, verifyUser } from "../utils/utils.js";
import Conversation from "../models/Conversation.js";

const router = express.Router();

/**
 * @description Create a new conversation with a contact
 * @route POST /api/conversations/:contactId
 * @access Public
 * @param {string} contactId - The ID of the contact to start a conversation with
 * @returns {Object} - The created conversation object
 * @throws {Error} - If the conversation already exists or if the contactId is not provided
 */

router.post("/:contactId", verifyUser, async (req, res, next) => {

    const { contactId } = req.params;
    const userId = req.user.id;

    try {
        if (!contactId) {
            throw createError(400, "Contact ID is required")
        }

        const conversation = await Conversation.findOne({
            members: { $all: [userId, contactId] }
        }).populate("members", "username profilePictureURL fullName email role mobile address")
            .populate("lastMessage", "text senderId seen createdAt");

        if (conversation) {
            res.status(200).json({
                message: "Conversation already exists",
                conversation: {
                    _id: conversation._id,
                    contactInfo: conversation.members.filter((member) => member._id.toString() !== userId)[0],
                    lastMessage: conversation.lastMessage,
                }
            });
        } else {

            const newConversation = new Conversation({
                members: [userId, contactId]
            })
            await newConversation.save()

            const newConversationPopulated = await Conversation.findById(newConversation._id)
                .populate("members", "username profilePictureURL fullName email role mobile address")
                .populate("lastMessage", "text senderId seen createdAt");

            res.status(200).json({
                message: "Conversation Created Successfully",
                conversation: {
                    _id: newConversationPopulated._id,
                    contactInfo: newConversationPopulated.members.filter((member) => member._id.toString() !== userId)[0],
                    lastMessage: null,
                }
            });
        }

    } catch (err) {
        errorHandler(err, next)
    }
})

/**
 * @description Get all conversations for the logged-in user (With 2 members only) (Group conversations are not included)
 * @route GET /api/conversations
 * @access Public
 * @returns {Array} - An array of conversation objects
 */

router.get("/", verifyUser, async (req, res, next) => {
    const userId = req.user.id;

    try {
        const conversations = await Conversation.find({
            members: { $in: [userId] },
            lastMessage: { $exists: true } // Only include conversations with a last message
        }).populate("members", "username profilePictureURL fullName email role mobile address")
            .populate("lastMessage", "text senderId seen createdAt").sort({ updatedAt: -1 });

        const data = conversations.map((conversation) => {
            return {
                _id: conversation._id,
                contactInfo: conversation.members.filter((member) => member._id.toString() !== userId)[0],
                lastMessage: conversation.lastMessage,
            }
        })

        res.status(200).json(data);
    } catch (err) {
        errorHandler(err, next)
    }
})

/**
 * * @description Get a single conversation by contactId (userId)
 * * @route GET /api/conversations/single/:contactId
 * * @access Public
 * * @param {string} contactId - The ID of the contact to get the conversation with
 * * @returns {Object} - The conversation object with the specified contactId
 * * @throws {Error} - If the conversation is not found or if the contactId is not provided
 */

router.get("/single/:contactId", verifyUser, async (req, res, next) => {
    const { contactId } = req.params;
    const userId = req.user.id;

    try {
        if (!contactId) {
            throw createError(400, "Contact ID is required")
        }

        const conversation = await Conversation.findOne({
            members: { $all: [userId, contactId] }
        }).populate("members", "username profilePictureURL fullName email role mobile address");

        const data = conversation ? {
            _id: conversation._id,
            contactInfo: conversation.members.filter((member) => member._id.toString() !== userId)[0],
        } : null

        res.status(200).json(data);
    } catch (err) {
        errorHandler(err, next)
    }
})


export default router;