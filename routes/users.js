import express from 'express';
import { createError, deleteFile, errorHandler, requestToBecomeHostHTML, sendEmail, upload, verifyAdmin, verifyUser } from '../utils/index.js'
import User from '../models/User.js';
import HostRequest from '../models/HostRequest.js';

const FILE_DEST = "profiles"

const router = express.Router();

/**
 * @description Update user profile picture
 * @route PATCH /api/users/profilePicture
 * @access Public
 * @returns {Object} - Returns the updated user object
 * @throws {Error} - Throws an error if the user is not found or if there is a problem with the file upload
 */
router.patch('/profilePicture', verifyUser, upload(FILE_DEST).single("profilePicture"), async (req, res, next) => {
    const { file } = req;
    const userId = req.user.id;
    try {

        if (!file) throw createError(400, "Please upload a file.");

        const path = `/images/${FILE_DEST}/${file.filename}`;

        const user = await User.findByIdAndUpdate(userId, { profilePictureURL: path }, { runValidators: true });

        deleteFile(user.profilePictureURL); // delete the old file if it exists

        res.status(200).json({ message: "Profile picture updated successfully", path });
    } catch (err) {
        deleteFile()
        errorHandler(err, next);
    }
})


/**
 * * @description Update user profile
 * * @route PATCH /api/users/profile
 * * @access Public
 * * @returns {Object} - Returns the updated user object
 * * @throws {Error} - Throws an error if the user is not found or if there is a problem with the file upload
 */
router.patch('/profile', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    const { fullName, email, mobile, countryCode } = req.body;

    try {
        let updateEmail = false;
        const userBeforeUpdate = await User.findById(userId);

        if (email && userBeforeUpdate.email !== email) {
            updateEmail = true;
        }

        const user = await User.findByIdAndUpdate(userId, {
            fullName,
            email,
            mobile,
            countryCode,
            isEmailVerified: updateEmail ? false : userBeforeUpdate.isEmailVerified,
        }, { runValidators: true, new: true });

        res.status(200).json({ message: "Profile updated successfully", userInfo:user });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Become a host request
 * * @route POST /api/users/becomeHost
 * * @access Public
 */
router.post('/becomeHost', verifyUser, async (req, res, next) => {
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);

        if (user.role == 1 || user.role == 2) {
            throw createError(400, "You are already a host or admin.");
        }

        const oldRequest = await HostRequest.findOne({ userId: userId, status: "pending" });
        if (oldRequest) {
            throw createError(400, "You have already sent a request to become a host.");
        }

        const newHostRequest = new HostRequest({ userId: userId });
        await newHostRequest.save();

        sendEmail(user.email, "Host Request", ``, requestToBecomeHostHTML(user));

        res.status(200).json({ message: "Request to become a host has been sent successfully. We Will Contact You Soon. Thank You.", hostRequest: newHostRequest });
    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * * @description Get user host request
 * * @route GET /api/users/hostRequest
 * * @access Public
 */
router.get('/hostRequest', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    try {
        const hostRequest = await HostRequest.findOne({ userId: userId });
        res.status(200).json({ message: "Host request fetched successfully", hostRequest });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Cancel a Host Request by Deleting it
 * * @route DELETE /api/users/hostRequest/:reqId
 * * @access Public
 */
router.delete('/hostRequest/:reqId', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    const { reqId } = req.params;

    try {

        const hostRequest = await HostRequest.findOne({ _id: reqId, userId });

        if(!hostRequest) {
            throw createError(404, "Host request not found");
        }
        if (hostRequest.status !== "pending") {
            throw createError(400, "You can only cancel a pending host request");
        }

        await HostRequest.findOneAndDelete({ _id: reqId, userId });
        res.status(200).json({ message: "Host request cancelled successfully" });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Get all users
 * * @route GET /api/users/all
 * * @access Admin
 * * @returns {Object} - Returns an array of users without password and __v field
 */
router.get('/all', verifyAdmin, async (req, res, next) => {
    try {
        const users = await User.find({}).select("-password -__v");
        res.status(200).json(users);
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * * @description Toggle user suspension status (suspended if active or active if suspended)\
 * * * @route POST /api/users/toggleSuspension/:id
 * * * @access Admin
 * * * @params {id} - User ID
 * * * @returns {Object} - Returns the updated user object with a message indicating the action taken
 */

router.post('/toggleSuspension/:id', verifyAdmin, async (req, res, next) => {
    const { id } = req.params;
    try {
        const user = await User.findById(id);
        if (!user) {
            throw createError(404, "User not found");
        }
        if (user.role === 1) {
            throw createError(400, "You can't suspend an admin");
        }

        if( user.status === 'suspended') {
            // If the user is already suspended, we will activate them
            await User.findByIdAndUpdate(id, {$set:{status: 'active'}}, { new: true, runValidators: true });
            return res.status(200).json({ message: "User activated successfully", user });
        }else if (user.status === 'active') {
            // If the user is active, we will suspend them
            await User.findByIdAndUpdate(id, {$set:{status: 'suspended'}}, { new: true, runValidators: true });
            return res.status(200).json({ message: "User suspended successfully", user });
        }

    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * * @description Update user profile by id
 * * @route PATCH /api/users/profile
 * * @access Admin
 * * @returns {Object} - Returns the updated user object
 * * @throws {Error} - Throws an error if the user is not found or if there is a problem with the file upload
 */
router.patch('/updateUser/:id', verifyAdmin, async (req, res, next) => {
    const userId = req.params.id;
    const { username, fullName, email, countryCode, mobile, role,subscripedToNewsLetter } = req.body;

    try {
        let updateEmail = false;
        const userBeforeUpdate = await User.findById(userId);

        if(userBeforeUpdate.role === 1) {
            throw createError(400, "You can't update an admin");
        }

        if (email && userBeforeUpdate.email !== email) {
            updateEmail = true;
        }

        const user = await User.findByIdAndUpdate(userId, {
            subscripedToNewsLetter,
            username,
            fullName,
            email,
            mobile,
            role,
            countryCode,
            isEmailVerified: updateEmail ? false : userBeforeUpdate.isEmailVerified,
        }, { runValidators: true, new: true });


        res.status(200).json({ message: "Profile updated successfully", userInfo:user });
    } catch (err) {
        errorHandler(err, next);
    }
})

export default router;