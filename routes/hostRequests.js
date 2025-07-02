import express from "express";
import HostRequest from "../models/HostRequest.js";
import { createError, deleteFile, errorHandler, verifyAdmin, verifyUser } from "../utils/utils.js";
import { upload } from "../utils/uploadConfig.js";
import { error } from "console";
import { createOneUserNotification } from "../utils/notifications.js";
import { sendEmail } from "../utils/emailService.js";
import User from "../models/User.js";

const router = express.Router();

/**
 * * @description get all host requests | only admin route
 * * @route GET /api/hostRequests
 * * @access Public
 * * @returns {Array} - Returns an array of host requests
 * * @throws {Error} - Throws an error if there is a problem retrieving the host requests
 */
router.get('/', verifyAdmin, async (req, res, next) => {
    try{
        const hostRequests = await HostRequest.find().sort({ createdAt: -1 }).populate(
            {
                path: 'userId',
                select: 'username fullName email mobile countryCode profilePictureURL',
                model: 'User'
            }
        );
        res.status(200).json(hostRequests);
    }catch(err){
        errorHandler(err, next);
    }
});


/**
 * * * @description Approve a host request | only admin route  
 * * * @route POST /api/hostRequests/approve/:id
 * * * @access Public
 * * * @params {id} - Host request ID
 * * * @returns {Object} - Returns the approved host request object
 */
router.post('/approve/:id', verifyAdmin, async (req, res, next) => {

    const { id } = req.params;

    try{
        const hostRequest = await HostRequest.findById(id).populate('userId', 'email');

        if (!hostRequest) {
            throw createError(404, 'Host request not found');
        }
        if (hostRequest.status == 'approved') {
            throw createError(400, 'Host request already approved');
        }

        // Update the user's role to host
        const user = await User.findByIdAndUpdate(hostRequest.userId._id, { role: 2 }, { new: true });

        hostRequest.status = 'approved';
        hostRequest.message = "Your Request Has Been Approved";
        await hostRequest.save();

        createOneUserNotification(
            hostRequest.userId._id,
            'Host Request Approved',
            `Your request to become a host has been approved. We wish you all the best in your hosting journey!`,
        )

        sendEmail(
            hostRequest.userId.email,
            "Host Request Approved",
            `Your request to become a host has been approved. We wish you all the best in your hosting journey!`,
            `<p>Your request to become a host has been approved. We wish you all the best in your hosting journey!</p>`
        )

        res.status(200).json({ message: 'Host request approved successfully', hostRequest });

    }catch(err){
        errorHandler(err, next);
    }

})

/**
 *  * * @description Reject a host request | only admin route
 *  * * @route POST /api/hostRequests/reject/:id
 * * * @access Public
 * * * @params {id} - Host request ID
 * * * @returns {Object} - Returns the rejected host request object
 */
router.post('/reject/:id', verifyAdmin, async (req, res, next) => {

    const { id } = req.params;

    try{
        const hostRequest = await HostRequest.findById(id).populate('userId', 'email');
        if (!hostRequest) {
            throw createError(404, 'Host request not found');
        }
        if (hostRequest.status == 'rejected') {
            throw createError(400, 'Host request already rejected');
        }
        hostRequest.status = 'rejected';
        hostRequest.message = "Your Request Has Been Rejected";
        await hostRequest.save();
        await User.findByIdAndUpdate(hostRequest.userId, { role: 3 }, { new: true });
        createOneUserNotification(
            hostRequest.userId._id,
            'Host Request Rejected',
            `Your request to become a host has been rejected. If you have any questions, please contact us.`,
        )
        sendEmail(
            hostRequest.userId.email,
            "Host Request Rejected",
            `Your request to become a host has been rejected. If you have any questions, please contact us.`,
            `<p>Your request to become a host has been rejected. If you have any questions, please contact us.</p>`
        )

        res.status(200).json({ message: 'Host request rejected successfully', hostRequest });
    }catch(err){
        errorHandler(err, next);
    }
})


export default router;