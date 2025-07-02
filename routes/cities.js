import express from 'express';
import City from '../models/City.js';
import { createError, deleteFile, errorHandler, verifyAdmin } from '../utils/utils.js';
import { upload } from '../utils/uploadConfig.js';
import Property from '../models/Property.js';


const router = express.Router();

// the full destination of the uploaded files is "uploads/images/properties/"
// can be accessed by the url "/images/properties/"
const FILE_DEST = "cities";


/**
 * * @description Create a new city | only admin route
 * * @route POST /api/cities
 * * @access Public
 * * @returns {Object} city - The created city object
 * * @body {name }
 * * @note ready to use
 * 
 */
router.post('/', verifyAdmin, upload(FILE_DEST).single("coverPicture"), async (req, res, next) => {
    const { name } = req.body;
    const coverPictureURL = req.file ? `/images/${FILE_DEST}/${req.file.filename}` : null; // Get the file path from the request
    try {
        const newCity = new City({
            name,
            coverPictureURL,
        });

        const savedCity = await newCity.save();
        res.status(201).json(savedCity);
    } catch (err) {
        deleteFile(coverPictureURL); // delete the uploaded file in case of error
        errorHandler(err, next);
    }
});


/**
 * * @description Update a city by ID | only admin route
 * * @route PATCH /api/cities/:id
 * * @access Public
 * * @params {id} - City ID
 * * @body {name}
 */
router.patch('/:id', verifyAdmin, upload(FILE_DEST).single("coverPicture"), async (req, res, next) => {
    const { name } = req.body;
    const coverPictureURL = req.file ? `/images/${FILE_DEST}/${req.file.filename}` : null; // Get the file path from the request

    try {
        const city = await City.findById(req.params.id);

        if (!city) {
            throw createError(404, 'City not found');
        }

        coverPictureURL ? deleteFile(city.coverPictureURL) : null; // Delete the old file if it exists

        if (name) city.name = name; // Update the name if provided
        if (coverPictureURL) city.coverPictureURL = coverPictureURL; // Update the cover picture URL if provided

        city.save(); // Save the updated city

        res.status(200).json(city); // Return the updated city
    } catch (err) {
        deleteFile(coverPictureURL); // Delete the new file if there was an error)
        errorHandler(err, next);
    }
});

/**
 * * @description Delete a city by ID | only admin route
 * * @route Delete /api/cities/:id
 * * @access Public
 * * @params {id} - City ID
 * * @note ready to use
 */
router.delete('/:id', verifyAdmin, async (req, res, next) => {
    try {
        const city = await City.findByIdAndDelete(req.params.id);

        deleteFile(city.coverPictureURL); // Delete the old file if it exists

        if (!city) {
            throw createError(404, 'City not found');
        }
        res.status(200).json({ message: 'City deleted successfully' });
    } catch (err) {
        errorHandler(err, next);
    }
});

/**
 * * @description Get all cities
 * * @route GET /api/cities
 * * @access Public
 * * @returns {Array} cities - Array of city objects
 * * @note ready to use
 */
router.get('/', async (req, res, next) => {
    try {
        const cities = await City.find().sort({ name: 1 });
        res.status(200).json(cities);
    } catch (err) {
        errorHandler(err, next);
    }
});


/**
 * @description Get a city by ID
 * @route GET /api/cities/:id
 * @access Public
 * @params {id} - City ID
 * @returns {Object} city - The city object
 * @note ready to use
 */
router.get('/:id', async (req, res, next) => {
    try {
        const city = await City.findById(req.params.id);
        if (!city) {
            throw createError(404, 'City not found');
        }
        res.status(200).json(city);
    } catch (err) {
        errorHandler(err, next);
    }
});

/**
 * * @description Get the top N cities
 * * @route GET /api/cities/topCities/:count
 * * @access Public
 * * @params {count} - Number of cities to return
 * * @returns {Array} cities - Array of city objects
 */
router.get('/topCities/:count', async (req, res, next) => {
    try {
        const count = parseInt(req.params.count);

        const cities = await Property.aggregate([
            {
                $match:{
                    status: "Available", // Only consider available properties
                }
            },
            {
                $group: {
                    _id: "$address.city",
                    avgRating: { $avg: "$avgRating" },
                    numberOfRatings: { $sum: "$numberOfRatings" },
                    numberOfReservations: { $sum: "$numberOfReservations" },
                }
            },
            {
                $lookup: {
                    from: "cities",
                    localField: "_id",
                    foreignField: "_id",
                    as: "city"
                }
            },
            {
                $unwind: "$city",
            },
            {
                $project: {
                    _id: 0,
                    cityId: "$_id",
                    cityName: "$city.name",
                    coverPictureURL: "$city.coverPictureURL",
                    avgRating: 1,
                    numberOfRatings: 1,
                    numberOfReservations: 1
                }
            },
            { $sort: { numberOfReservations: -1 } }, // Sort by number of reservations in descending order
            { $limit: count } // Limit the result to the specified count
        ])


        res.status(200).json(cities);
    } catch (err) {
        errorHandler(err, next);
    }
});




export default router;