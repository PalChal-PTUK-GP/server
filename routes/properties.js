import express from 'express';
import Property from '../models/Property.js'
import Region from '../models/Region.js'
import { createError, deleteFile, deleteUploadedFiles, errorHandler, verifyAdmin, verifyHost } from '../utils/utils.js';
import { upload } from '../utils/uploadConfig.js';
import { createOneUserNotification } from '../utils/notifications.js';
import Reservation from '../models/Reservation.js';
import WishList from '../models/WishList.js';
import { newPropertyCreated } from '../utils/index.js';
import mongoose from 'mongoose';

const router = express.Router();

// the full destination of the uploaded files is "uploads/images/properties/"
// can be accessed by the url "/images/properties/"
const FILE_DEST = "properties";

/**
 * @description Add a new property
 * @route POST /api/properties/addProperty
 * @access Public
 * @body {title, description, rentFee, city, region, street, type, coorinates: array of length 2, removeImages: array, thumbnailURL:file, images:files}
 * @header {"Content-Type": "multipart/form-data"}
 * @returns {Object} 201 - Property added successfully
 * @returns {Object} 500 - Internal server error
 * @note ready to use
 */
router.post('/addProperty', verifyHost, upload(FILE_DEST).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), async (req, res, next) => {

    const { title, description, rentFee, city, region, street, location, amenities } = req.body;
    const userId = req.user.id;

    try {
        const thumbnailUrl = `/images/properties/${req.files.thumbnail[0].filename}`;
        const imageUrls = req.files.images.map(file => `/images/properties/${file.filename}`);

        const property = new Property({
            owner: userId,
            title,
            description,
            location: JSON.parse(location),
            address: { city, region, street },
            rentFee,
            thumbnailURL: thumbnailUrl,
            images: imageUrls,
            amenities: amenities ? JSON.parse(amenities) : [],
        });

        await property.save();
        res.status(201).json({ message: "Property Added Successfully", property });

        createOneUserNotification(userId, "New Property Added", newPropertyCreated(title, property._id)); // create a notification for the user

    } catch (err) {
        deleteUploadedFiles(req.files);
        errorHandler(err, next);
    }
})

/**
 * * @description update the property field by id, only onwer or admin can edit the property
 * * @route PATCH /api/properties/:propertyId
 * * @access Public
 * * @body {title, description, rentFee, city, region, street, type, coorinates: array of length 2, removeImages: array, thumbnailURL:file, images:files}
 * * @header {"Content-Type": "multipart/form-data"}
 * * @params {propertyId}
 * * @note ready to use
 */
router.patch('/:propertyId', verifyHost, upload(FILE_DEST).fields([
    { name: 'thumbnailURL', maxCount: 1 },
    { name: 'images', maxCount: 10 }
]), async (req, res, next) => {

    const { propertyId } = req.params;
    const { title, description, rentFee, city, region, street, type, coordinates } = req.body;
    const removeImages = req.body.removeImages ? JSON.parse(req.body.removeImages) : [];
    const newAmenities = req.body.amenities ? JSON.parse(req.body.amenities) : [];

    try {
        const property = await Property.findById(propertyId);

        if (!property) {
            throw createError(404, "Property not found")
        }
        if (property.owner.toString() !== req.user.id && req.user.role !== 1) {
            throw createError(403, "You are not authorized to edit this property")
        }

        const reservations = await Reservation.find({ propertyId: property._id, status: "confirmed", startDate: { $gte: Date.now() } });

        if (reservations.length > 0) {
            throw createError(400, "You can't edit this property, it has active reservations")
        }

        // update text fields
        if (title) property.title = title;
        if (description) property.description = description;
        if (rentFee) property.rentFee = rentFee;
        if (coordinates) property.location = JSON.parse(coordinates);
        if (city) property.address.city = city;
        if (region) property.address.region = region;
        if (street) property.address.street = street;
        if (type) property.type = type;

        if (req.files.thumbnailURL) {
            deleteFile(`uploads/${property.thumbnailURL}`) // delete old thumbnail image from the server
            property.thumbnailURL = `/images/properties/${req.files.thumbnailURL[0].filename}`; // update thumbnail image path
        }

        // upload new images
        if (req.files.images && req.files.images.length > 0) {
            const imageUrls = req.files.images.map(file => `/images/properties/${file.filename}`);
            property.images.push(...imageUrls); // add new images to the property
        }

        // update images, the images to be deleted are passed in the request body as an array of strings (strings are images pathes)
        if (removeImages.length > 0) {
            property.images = property.images.filter(image => !removeImages.includes(image.toString())); // remove images from the property
            removeImages.map(image => deleteFile(`uploads/${image}`))
        }

        if (newAmenities.length > 0) {
            property.amenities = newAmenities; // update amenities
        }

        await property.save(); // save the updated property
        res.status(200).json({ message: "Property updated successfully", property });
    } catch (err) {
        deleteUploadedFiles(req.files);
        errorHandler(err, next);
    }
})

/**
 * * @description delete the property by id, only onwer or admin can delete the property
 * * @route DELETE /api/properties/:propertyId
 * * @access Public
 * * @params {propertyId}
 * * @note ready to use
 */
router.delete('/:propertyId', verifyHost, async (req, res, next) => {
    const { propertyId } = req.params;
    try {
        const property = await Property.findById(propertyId);
        if (!property) {
            throw createError(404, "Property not found")
        }
        if (property.owner.toString() !== req.user.id && req.user.role !== "admin") {
            throw createError(403, "You are not authorized to delete this property")
        }

        const reservations = await Reservation.find({ propertyId: property._id });
        if (reservations.length > 0) {
            throw createError(400, "You can't delete this property, it has active reservations")
        }

        const wishlists = await WishList.find({ propertyId: property._id });

        if (wishlists.length > 0) {
            await WishList.deleteMany({ propertyId: property._id }); // delete all wishlist items for this property
        }

        // delete all images from the server
        property.images.map(image => deleteFile(`uploads/${image}`)); // delete all images from the server
        deleteFile(`uploads/${property.thumbnailURL}`); // delete thumbnail image from the server

        await Property.findByIdAndDelete(propertyId); // delete the property from the database
        res.status(200).json({ message: "Property deleted successfully" });
    } catch (err) {
        errorHandler(err, next);
    }
});

/**
 * * @description get property details by id, this is important for the property details page
 * * @route GET /api/properties/:propertyId
 * * @access Public
 * * @params {propertyId}
 * * @note ready to use
 */
router.get("/:propertyId", async (req, res, next) => {
    const { propertyId } = req.params;
    try {
        const property = await Property.findById(propertyId).populate("amenities", "name icon")
            .populate("address.city", "name")
            .populate("address.region", "name");

        if (!property) {
            throw createError(404, "Property not found")
        }
        res.status(200).json(property);
    } catch (err) {
        errorHandler(err, next);
    }
})

/**
 * * @description get all properties with filtering and pagination, you can filter by any set of query parameters
 * * @route GET /api/properties/search/:page/:limit?city=city&startDate=startDate&endDate=endDate&rating=rating&minPrice=minPrice&maxPrice=maxPrice&amenities=amenity1,amenity2
 * * @access Public
 * * @params {page, limit}
 * * @query {city, region, startDate, endDate, rating, minPrice, maxPrice, freebies, amenities }
 * * @note need to be enhanced, it's working correctly but need to find a solution for the startDate and endDate (availableDates) to be in the same format as the database
 */
router.get('/', async (req, res, next) => {
    //set pagenation variables page and limit
    const page = parseInt(req.query.page) || 1; // default page is 1
    const limit = parseInt(req.query.limit) || 10; // default limit is 10
    const skip = (page - 1) * limit;

    //set query variables, the query is an object that will be passed to the find method of the Property model
    const query = {};
    const { city, region, startDate, endDate, rating, minPrice, maxPrice, amenities } = req.query;
    const invloveDates = req.query.invloveDates == 'true';

    if (city) query['address.city'] = city;
    if (region) query['address.region'] = region;
    if (rating) query.avgRating = { $gte: parseFloat(rating) };
    if (amenities) query.amenities = { $all: amenities.toString().split(",") };
    if (minPrice || maxPrice) query.rentFee = { ...(minPrice && { $gte: parseFloat(minPrice) }), ...(maxPrice && { $lte: parseFloat(maxPrice) }) };

    try {
        // get all reservations that match the query
        let reservations = [];
        let reservedPropertyIds = []; // array of property ids that are reserved

        if (startDate && endDate && invloveDates) {
            const sdate = (new Date(startDate))
            const edate = (new Date(endDate))

            const utcSdate = new Date(sdate.getTime() - sdate.getTimezoneOffset() * 60000); // Convert to UTC
            const utcEdate = new Date(edate.getTime() - edate.getTimezoneOffset() * 60000); // Convert to UTC

            reservations = await Reservation.find({
                $or: [
                    { startDate: { $gte: utcSdate, $lt: utcEdate } }, // check if the start date is in the range
                    { endDate: { $gt: utcSdate, $lte: utcEdate } }, // check if the end date is in the range
                    { startDate: { $lt: utcSdate }, endDate: { $gt: utcEdate } }, // check if the range is in the reservation
                ],
                status: "confirmed"
            });

            reservedPropertyIds = reservations.map(reservation => reservation.propertyId.toString()); // get all property ids that are reserved
        }

        // get all properties that match the query and are not reserved
        const properties = await Property.find({ ...query, _id: { $nin: reservedPropertyIds }, status: "Available" },
            "title description address type rentFee thumbnailURL avgRating numberOfReservations numberOfRatings location status amenities")
            .sort({ numberOfReservations: -1 })
            .skip(skip)
            .limit(limit)
            .populate("address.city", "name")
            .populate("address.region", "name")
            ;

        let totalProperties = await Property.countDocuments({ ...query, _id: { $nin: reservedPropertyIds }, status: "Available" }); // count the total number of properties that match the query



        res.status(200).json({ totalProperties, properties });
    } catch (err) {
        errorHandler(err, next);
    }
})



/**
 * * * @description get a specific property reserved dates by property id
 * * * @route GET /api/properties/availablity/:propertyId
 * * * @access Public
 * * * @params {propertyId}
 * * * @note ready to use
 * * * @returns {Object} 200 - reservedDates array of objects with startDate and endDate
 * * * @returns {Object} 500 - Internal server error
 */

router.get('/availablity/:propertyId', async (req, res, next) => {
    const { propertyId } = req.params;

    try {
        const reservations = await Reservation.find({
            propertyId,
            status: { $in: ['confirmed'] },
            startDate: { $gte: Date.now() }, // Check for future reservations
        });

        const reservedDates = reservations.map(reservation => {
            return {
                startDate: reservation.startDate,
                endDate: reservation.endDate,
            };
        });

        return res.status(200).json(reservedDates);
    } catch (error) {
        errorHandler(error, next);
    }
});

/**
 * * * @description get all properties of a host
 * * * @route GET /api/properties/host/all
 * * * @access Private
 * * * @returns {Object} 200 - properties array and totalProperties count
 */

router.get('/host/all', verifyHost, async (req, res, next) => {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1; // default page is 1
    const limit = parseInt(req.query.limit) || 10; // default limit is 10
    const skip = (page - 1) * limit;

    try {
        const properties = await Property.find({ owner: userId })
            .populate("address.city", "name")
            .populate("address.region", "name")
            .populate("amenities", "name icon").sort({ createdAt: -1 }).skip(skip).limit(limit);

        const totalProperties = await Property.countDocuments({ owner: userId });

        res.status(200).json({ properties, totalProperties });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * * @description toggle the activation status of a property, only owner or admin can control the activation
 * * * @route PATCH /api/properties/activation/:propertyId
 * * * @access Private
 * * @params {propertyId}
 * * @returns {Object} 200 - message and updated property
 */
router.patch('/activation/:propertyId', verifyHost, async (req, res, next) => {
    const { propertyId } = req.params;
    try {
        const property = await Property.findById(propertyId);
        if (!property) {
            throw createError(404, "Property not found")
        }
        if (property.owner.toString() !== req.user.id && req.user.role !== 1) {
            throw createError(403, "You are not authorized to control activation of this property")
        }

        if (property.status === "Available") {
            await Property.findByIdAndUpdate(propertyId, { status: "Inactive" }, { new: true })
        } else if (property.status === "Inactive") {
            await Property.findByIdAndUpdate(propertyId, { status: "Available" }, { new: true })
        } else {
            throw createError(400, "Property status can only be toggled between Available and Inactive, current status is " + property.status + " Contact support if you need to Activate the Status");
        }

        res.status(200).json({ message: "Property status updated successfully", property });

    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * * * @description get all properties for admin, this is used in the admin dashboard to manage properties
 * * * @route GET /api/properties/admin/all
 * * * @access Admin
 * * * @returns {Object} 200 - properties array and totalProperties count
 */

router.get('/admin/all', verifyAdmin, async (req, res, next) => {
    const page = parseInt(req.query.page) || 1; // default page is 1
    const limit = parseInt(req.query.limit) || 10; // default limit is 10
    const skip = (page - 1) * limit;

    const { _id, owner, title, city, region, type, status, rentFee } = req.query;

    const filters = {}
    if (_id && mongoose.Types.ObjectId.isValid(_id)) filters._id = new mongoose.Types.ObjectId(_id); // convert string to ObjectId for exact match
    if (owner) filters['owner.username'] = { $regex: owner, $options: 'i' }; // case-insensitive search
    if (title) filters.title = { $regex: title, $options: 'i' }; // case-insensitive search
    if (city) filters['city'] = { $regex: city, $options: 'i' }; // case-insensitive search
    if (region) filters['address.region'] = { $regex: region, $options: 'i' }; // case-insensitive search
    if (type) filters.type = { $regex: type, $options: 'i' }; // case-insensitive search
    if (status) filters.status = { $regex: status, $options: 'i' }; // exact match for status
    if (rentFee) filters.rentFee = { $lte: parseFloat(rentFee) }; // filter by rent fee greater than or equal to the specified value

    try {
        const properties = await Property.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'owner',
                    foreignField: '_id',
                    as: 'owner'
                }
            }, {
                $unwind: {
                    path: '$owner',
                }
            }, {
                $lookup: {
                    from: 'cities',
                    localField: 'address.city',
                    foreignField: '_id',
                    as: 'address.city'
                }
            }, {
                $unwind: {
                    path: '$address.city',
                }
            }, {
                $lookup: {
                    from: 'regions',
                    localField: 'address.region',
                    foreignField: '_id',
                    as: 'address.region'
                }
            }, {
                $unwind: {
                    path: '$address.region',
                }
            }, {
                $match: filters
            },
            {
                $facet: {
                    totalDocs: [{ $count: "count" }],
                    properties: [
                        {
                            $sort: { createdAt: -1 } // Sort by createdAt in descending order
                        }, {
                            $skip: skip // Skip the documents for pagination
                        }, {
                            $limit: limit // Limit the number of documents returned
                        }, {
                            $project: {
                                title: 1,
                                rentFee: { $toDouble: '$rentFee' },
                                thumbnailURL: 1,
                                location: 1,
                                type: 1,
                                status: 1,
                                avgRating: 1,
                                numberOfReservations: 1,
                                numberOfRatings: 1,
                                createdAt: 1,
                                updatedAt: 1,
                                owner: {
                                    _id: '$owner._id',
                                    username: '$owner.username',
                                    fullName: '$owner.fullName',
                                    email: '$owner.email',
                                    countryCode: '$owner.countryCode',
                                    mobile: '$owner.mobile',
                                },
                                city: "$address.city.name",
                                region: "$address.region.name",
                                street: "$address.street",
                            }
                        }
                    ]
                }
            }
        ])

        res.status(200).json({ properties: properties[0].properties, totalDocs: properties[0].totalDocs[0]?.count });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * * @description toggle suspension status of a property by id (Suspended => Available), only admin can suspend a property
 * 
 */
router.post('/admin/suspend/:propertyId', verifyAdmin, async (req, res, next) => {
    const { propertyId } = req.params;
    try {
        const property = await Property.findById(propertyId);
        const operation = property.status === "Suspended" ? "Available" : "Suspended"; // toggle the status

        if (!property) {
            throw createError(404, "Property not found")
        }
        if (property.status !== "Suspended") {
            await Property.findByIdAndUpdate(propertyId, { status: "Suspended" }, { new: true });
            res.status(200).json({ message: `Property Suspended Successfully`, status: "Suspended" });
        } else {
            await Property.findByIdAndUpdate(propertyId, { status: "Available" }, { new: true });
            res.status(200).json({ message: `Property Activated Successfully`, status: "Available" });
        }
    } catch (err) {
        errorHandler(err, next);
    }
})
export default router;