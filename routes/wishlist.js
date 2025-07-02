import express from "express";
import { errorHandler, verifyUser } from "../utils/index.js";
import WishList from "../models/WishList.js";

const router = express.Router();


/**
 * * @description Add or remove a property from the wishlist (if it exists, remove it, if not, add it)
 * * @route POST /api/wishlist/:propertyId
 * * @access Private
 * * @params {propertyId}
 * * @returns {Object} 200 - Property removed from wishlist
 * * @returns {Object} 201 - Property added to wishlist
 */
router.post('/:propertyId', verifyUser, async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user.id;

        // Check if the property is already in the wishlist
        const userWishList = await WishList.findOne({ userId, propertyId });

        if (userWishList) {
            // If it is, remove it from the wishlist
            await WishList.deleteOne({ userId, propertyId });
            return res.status(200).json({ message: "Property removed from wishlist", isFavorite: false });
        }else{
            // If it isn't, add it to the wishlist
            const wishListItem = new WishList({ userId, propertyId });
            await wishListItem.save();

            return res.status(201).json({message: "Property added to wishlist", isFavorite: true});
        }

    } catch (err) {
        errorHandler(err, next)
    }
});


/**
 * * @description Get all wishlist items for the user
 * * @route GET /api/wishlist
 * * @access Private
 * * @returns {Object} 200 - Array of wishlist items
 */
router.get('/', verifyUser, async (req, res, next) => {
    try {
        const userId = req.user.id;
        const wishListItems = await WishList.find({ userId })
        .populate({
            path: 'propertyId',
            populate: [
                {path: 'address.city', select: 'name'},
                {path: 'address.region', select: 'name'},
            ]
        })

        res.status(200).json(wishListItems);
    } catch (err) {
        errorHandler(err, next)
    }
});


/**
 * * @description Check if a property is in the wishlist
 * * @route GET /api/wishlist/isFavorite/:propertyId
 * * @access Private
 * * @params {propertyId}
 * * @returns {Object} 200 - Property is in wishlist or not
 */

router.get('/isFavorite/:propertyId', verifyUser, async (req, res, next) => {
    try {
        const { propertyId } = req.params;
        const userId = req.user.id;

        // Check if the property is already in the wishlist
        const userWishList = await WishList.findOne({ userId, propertyId });

        if (userWishList) {
            return res.status(200).json({ message: "Property is in wishlist", isFavorite: true });
        } else {
            return res.status(200).json({ message: "Property is not in wishlist", isFavorite: false });
        }

    } catch (err) {
        errorHandler(err, next)
    }
});

/**
 * * @description Get the count of wishlist items for the user
 * * @route GET /api/wishlist/count
 * * @access Public
 * * @returns {Object} 200 - Count of wishlist items
 * * @returns {Object} 500 - Error message
 */
router.get('/count', verifyUser, async (req, res, next) => {
    const userId = req.user.id;
    try{
        const count = await WishList.countDocuments({ userId });
        res.status(200).json({ count });
    }catch(err){
        errorHandler(err, next)
    }
})

export default router;