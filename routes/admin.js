import express from 'express';
import { errorHandler, verifyAdmin } from '../utils/index.js';
import User from '../models/User.js';
import Reservation from '../models/Reservation.js';
import { getLastMonths } from '../utils/date.js';
import Property from '../models/Property.js';
import archiver from 'archiver';
import fs from 'fs';

const router = express.Router();


router.get('/backup', verifyAdmin, async (req, res, next) => {
    const folderPath = process.env.UPLOAD_DIR;
    const zipName = 'uploads-backup.zip';

    try {
        if (!folderPath) {
            return res.status(500).json({ error: 'Upload directory not configured.' });
        }

        if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ error: 'Upload directory not found.' });
        }

        res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
        res.setHeader('Content-Type', 'application/zip');

        // Flush headers to ensure client receives them immediately
        if (res.flushHeaders) res.flushHeaders();

        const archive = archiver('zip', { zlib: { level: 9 } });

        archive.pipe(res);
        archive.directory(folderPath, false);

        await archive.finalize();
    } catch (err) {
        errorHandler(err, next);
    }
});

router.get('/dashboard', verifyAdmin, async (req, res, next) => {

    try {
        const totalUsers = await User.countDocuments();
        const totalClients = await User.countDocuments({ role: 3 });
        const totalHosts = await User.countDocuments({ role: 2 });
        const totalAdmins = await User.countDocuments({ role: 1 });

        const totalProperties = await Property.countDocuments({});
        const activeProperties = await Property.countDocuments({ status: "Available" });
        const inactiveProperties = await Property.countDocuments({ status: "Inactive" });
        const freezedProperties = await Property.countDocuments({ status: "Freezed" });

        const allReservations = await Reservation.countDocuments({
            status: { $in: ["confirmed", "finished"] }
        });

        const finishedReservations = await Reservation.countDocuments({
            status: "finished"
        });

        // Get the total number of reservations
        const totalReservations = await Reservation.aggregate([
            {
                $match: {
                    status: { $in: ["confirmed", "finished"] },
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$createdAt" },
                        month: { $month: "$createdAt" },
                    },
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
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }, {
                $limit: 6 // Get the last 6 months
            }
        ]);

        const last6Months = getLastMonths(5);

        const info = {};
        totalReservations.forEach(reservation => {
            info[`${reservation._id.year}-${reservation._id.month}`] = {
                count: reservation.count,
                totalFee: parseFloat(reservation.totalFee.toString()),
                finishedRentFee: parseFloat(reservation.finishedRentFee.toString()),
                FreezedFunds: parseFloat(reservation.FreezedFunds.toString())
            }
        })


        const formattedResult = last6Months.map(month => {
            const key = `${month.year}-${month.month}`;
            const value = info[key];

            return {
                ...value || {
                    count: 0,
                    totalFee: 0,
                    finishedRentFee: 0,
                    FreezedFunds: 0
                },
                month: month.monthName,
                year: month.year,
            }

        });
        res.status(200).json({
            cards: {
                totalUsers,
                totalClients,
                totalHosts,
                totalAdmins,
                totalProperties,
                activeProperties,
                inactiveProperties,
                freezedProperties,
                allReservations,
                finishedReservations
            },
            graphs: formattedResult
        })

    } catch (err) {
        errorHandler(err, next);
    }

});

export default router;