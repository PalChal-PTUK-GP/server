import express from "express";
import Amenity from "../models/Amenity.js";
import { upload } from "../utils/uploadConfig.js";
import { deleteFile, errorHandler, verifyAdmin } from "../utils/utils.js";

const router = express.Router();

const FILE_DEST = "amenities";

/**
 * * @description Create a new amenity | only admin route
 * * @route POST /api/amenities
 * * @access Public
 * * @returns {Object} amenity - The created amenity object
 * * @body {name, coverPictureURL}
 * * @note ready to use
 */
router.post("/", verifyAdmin, upload(FILE_DEST).single('icon'), async (req, res, next) => {
    const { name } = req.body;
    const icon = req.file ? `/images/${FILE_DEST}/${req.file.filename}` : null; // Get the file path from the request

    try {
        const newAmenity = new Amenity({
            name,
            icon,
        });

        const savedAmenity = await newAmenity.save();
        res.status(201).json(savedAmenity);
    } catch (err) {
        deleteFile()
        errorHandler(err, next);
    }
});


/**
 * * @description Update a amenity by ID | only admin route
 * * @route PATCH /api/amenities/:id
 * * @access Public
 * * @params {id} - Amenity ID
 * * @body {name}
 * * @note ready to use
 */
router.patch("/:id", verifyAdmin, upload(FILE_DEST).single('icon'), async (req, res, next) => {
    const { name } = req.body;
    const icon = req.file ? `/images/${FILE_DEST}/${req.file.filename}` : null; // Get the file path from the request

    try {
        const amenity = await Amenity.findById(req.params.id);
        if (!amenity) {
            throw createError(404, 'Amenity not found');
        }
        req.file ? deleteFile(amenity.icon) : null; // Delete the old file if it exists

        amenity.name = name ? name : amenity.name;
        amenity.icon = req.file ? icon : amenity.icon; // Update the icon if a new file is uploaded

        await amenity.save();
        res.status(200).json(amenity);

    } catch (err) {
        deleteFile(icon); // delete the uploaded file in case of error
        errorHandler(err, next);
    }
})


/**
 * * @description Delete a amenity by ID | only admin route
 * * @route DELETE /api/amenities/:id
 * * @access Public
 * * @params {id} - Amenity ID
 */
router.delete("/:id", verifyAdmin, async (req, res, next) => {
    try {
        const amenity = await Amenity.findById(req.params.id);
        if (!amenity) {
            throw createError(404, 'Amenity not found');
        }
        deleteFile(amenity.icon); // Delete the old file if it exists
        await Amenity.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: "Amenity deleted successfully" });
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * * @description Get all amenities 
 * * @route GET /api/amenities
 * * @access Public
 * * @returns {Object} amenities - The list of amenities
 */
router.get("/", async (req, res, next) => {
    try {
        const amenities = await Amenity.find().sort({ name: 1 });
        res.status(200).json(amenities);
    } catch (err) {
        errorHandler(err, next);
    }
})


/**
 * 
 */
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;
        const amenity = await Amenity.findById(id);
        if (!amenity) {
            throw createError(404, 'Amenity not found');
        }
        res.status(200).json(amenity);
    } catch (err) {
        errorHandler(err, next);
    }
})

export default router;