import multer from 'multer';
import path from 'path';
/**
 * 
 * @param subDestination - subdirectory for the file upload
 * @description multer configuration for file upload
 * @returns 
 */

const uploadDir = process.env.UPLOAD_DIR;

export const upload = (subDestination) => {

    // Set storage engine
    const storage = multer.diskStorage({
        destination: `${uploadDir}/images/${subDestination}/`,
        filename: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
        },
    });

    // File filter to accept only images

    const fileFilter = (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Only image files are allowed!"), false);
        }
    };

    const upload = multer({ storage, fileFilter }); // 5MB limit
    // const upload = multer({ storage, fileFilter, limits: { files: 10 } });

    return upload;

}

