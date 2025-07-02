import express from 'express';
import Region from '../models/Region.js';
import City from '../models/City.js';
import { createError, deleteFile, errorHandler, verifyAdmin } from '../utils/utils.js';
import { upload } from '../utils/uploadConfig.js';

const router = express.Router();

const FILE_DEST = "regions";


/**
 * * @description Create a new region | only admin route
 * * @route POST /api/regions
 * * @access Public
 * * @returns {Object} region - The created region object
 * * @body {name, cityId}
 * * @note ready to use
 */

router.post('/', verifyAdmin, upload(FILE_DEST).single("coverPictureURL"), async (req, res, next) => {

    const { name, cityId } = req.body;
    const coverPictureURL = req.file ? `/images/${FILE_DEST}/${req.file.filename}` : null; // Get the file path from the request

    try {

        const city = await City.findById(cityId);

        if (!city) {
            throw createError(404, 'City not found');
        }

        const newRegion = new Region({
            name,
            cityId,
            coverPictureURL,
        })

        const savedRegion = await newRegion.save()
        res.status(201).json(savedRegion)
    } catch (err) {
        deleteFile(coverPictureURL); // delete the uploaded file in case of error
        errorHandler(err, next);
    }
})


/**
 * * @description Update a region by ID | only admin route
 * * @route PATCH /api/regions/:id
 * * @access Public
 * * @params {id} - Region ID
 * * @body {name, cityId}
 */
router.patch('/:id', verifyAdmin, upload(FILE_DEST).single("coverPictureURL"), async (req, res, next) => {
    const { name } = req.body;
    const coverPictureURL = req.file ? `/images/${FILE_DEST}/${req.file.filename}` : null; // Get the file path from the request

    try {
        const region = await Region.findById(req.params.id);

        if (!region) {
            throw createError(404, 'Region not found');
        }

        req.file ? deleteFile(region.coverPictureURL) : null; // Delete the old file if it exists

        const updatedRegion = await Region.findByIdAndUpdate(req.params.id, {
            name,
            coverPictureURL,
        }, { new: true });

        await updatedRegion.populate('cityId', 'name coverPictureURL'); // Populate the cityId field with the city name and cover picture URL

        res.status(200).json({updatedRegion, message: "Region updated successfully"});
    } catch (err) {
        deleteFile(coverPictureURL); // delete the uploaded file in case of error
        errorHandler(err, next);
    }
})


/**
 * * @description Delete a region by ID | only admin route
 * * @route DELETE /api/regions/:id
 * * @access Public
 * * @params {id} - Region ID
 * * @returns {Object} message - success message
 * * @note ready to use
 */
router.delete('/:id', verifyAdmin, async (req, res, next) => {
    try {
        const region = await Region.findById(req.params.id);

        if (!region) {
            throw createError(404, 'Region not found');
        }

        await Region.findByIdAndDelete(req.params.id);
        deleteFile(region.coverPictureURL); // Delete the file from the server

        res.status(200).json({ message: "Region deleted successfully" });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Get All Regions
 * * @route GET /api/regions
 * * @access Public
 * * @returns {Array} regions - Array of region objects
 * * @note ready to use
 */
router.get('/', async (req, res, next) => {
    try {
        const regions = await Region.find({}, "name cityId coverPictureURL").populate('cityId', 'name coverPictureURL'); // Populate the cityId field with the city name and cover picture URL
        res.status(200).json(regions);
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Get all Regions belonging to a specific city
 * * @route GET /api/regions/:cityId
 * * @access Public
 * * @params {cityId} - City ID
 * * @returns {Array} regions - Array of region objects
 * * @note ready to use
 */
router.get('/all/:cityId', async (req, res, next) => {
    try {
        const regions = await Region.find({ cityId: req.params.cityId }, "name cityId coverPictureURL").populate('cityId', 'name coverPictureURL'); // Populate the cityId field with the city name and cover picture URL
        res.status(200).json(regions);
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Get Details of a region by ID
 * * @route GET /api/regions/:id
 * * @access Public
 * * @params {id} - Region ID
 * * @returns {Object} region - The region object
 * * @note ready to use
 */
router.get('/:id', async (req, res, next) => {
    try {
        const region = await Region.findById(req.params.id).populate('cityId', 'name coverPictureURL'); // Populate the cityId field with the city name and cover picture URL

        if (!region) {
            throw createError(404, 'Region not found');
        }

        res.status(200).json(region);
    } catch (err) {
        errorHandler(err, next);
    }
})



export default router;