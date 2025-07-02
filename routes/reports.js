import express from 'express';
import { errorHandler, verifyHost } from '../utils/index.js';
import Property from '../models/Property.js';
import Reservation from '../models/Reservation.js';
import mongoose from 'mongoose';
import { getLastMonths, } from '../utils/date.js';

const router = express.Router();


router.get("/host/dashboard/overview", verifyHost, async (req, res, next) => {
    const userId = req.user.id;

    try {

        // Get the total number of properties
        const totalProperties = await Property.countDocuments({ owner: userId });

        // Get the total number of reservations
        const totalReservations = await Reservation.aggregate([
            {
                $lookup: {
                    from: "properties",
                    localField: "propertyId",
                    foreignField: "_id",
                    as: "property",
                },
            },
            { $unwind: "$property" },
            {
                $match: {
                    status: { $in: ["confirmed", "finished"] },
                    "property.owner": new mongoose.Types.ObjectId(userId),
                }
            },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalFee: { $sum: "$totalFee" },
                    finishedRentFee: {
                        $sum: { $cond: [{ $eq: ["$status", "finished"] }, "$totalFee", 0] }
                    },
                    FreezedFunds: {
                        $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, "$totalFee", 0] }
                    },
                }
            },
        ]);

        const monthlyEarnings = await Reservation.aggregate([
            {
                $lookup: {
                    from: "properties",
                    localField: "propertyId",
                    foreignField: "_id",
                    as: "property",
                },
            },
            { $unwind: "$property" },
            {
                $match: {
                    status: { $in: ["confirmed", "finished"] },
                    "property.owner": new mongoose.Types.ObjectId(userId),
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" }
                    },
                    earnings: { $sum: "$totalFee" }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } },
            { $limit: 6 } // Limit to the last 6 months
        ]);


        const last6Months = getLastMonths(5);

        // Map aggregation results for quick lookup
        const earningsMap = {};
        monthlyEarnings.forEach(item => {
            earningsMap[`${item._id.year}-${item._id.month}`] = parseFloat(item.earnings.toString());
        });

        // Build the final array, filling 0 for missing months
        const formattedMonthlyEarnings = last6Months.map(m => ({
            year: m.year,
            month: m.monthName,
            earnings: earningsMap[`${m.year}-${m.month}`] || 0
        }));


        res.status(200).json({
            totalProperties,
            totalReservations: totalReservations[0]?.count || 0,
            totalEarnings: totalReservations[0]?.totalFee ? parseFloat(totalReservations[0].totalFee.toString()) : 0,
            withdrableEarnings: totalReservations[0]?.finishedRentFee ? parseFloat(totalReservations[0].finishedRentFee.toString()) : 0,
            freezedFunds: totalReservations[0]?.FreezedFunds ? parseFloat(totalReservations[0].FreezedFunds.toString()) : 0,
            monthlyEarnings: formattedMonthlyEarnings // Get the last 6 months
        });


    } catch (err) {
        errorHandler(err, next);
    }
});






export default router;