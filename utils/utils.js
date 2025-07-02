import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import fs from 'fs';
import { fileURLToPath } from "url";
import path from "path";

// 🔥 Create `__filename` and `__dirname`
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

export const createError = (status, message, errName = "custom") => {
    const error = new Error(message);
    error.status = status;
    error.name = errName;
    return error;
};

/**
 * * @description Error handler middleware in case there are a special errors need to be handled 
 */
export const errorHandler = (err, next) => {
    if(err.code == 11000){
        next(createError(400, `${Object.keys(err.keyValue)[0]} already exists`));
    }
    else if (err.name == "ValidationError") {
        next(createError(400, Object.values(err.errors)));
    }
    else if (err.name == "custom") {
        next(createError(400, err.message));
    }
    else {
        next(createError(400, `${"Some thing went wrong please try again"} error: ${err.message}`, 'unknown'));
    }
}

/**
 * 
 * @description delete uploaded files from the server in case of error or cancellation
 */
export const deleteUploadedFiles = (files) => {
    if (!files) return;

    Object.values(files).flat().forEach(file => {
        const filePath = path.join(__dirname, "../", file.path);
        fs.unlink(filePath, (err) => {
            return createError(400,"File Couldn't be deleted");
        });
    });
};

export const deleteFile = (file) => {
    if (!file) return;

    fs.unlink(`uploads${file}`, (err) => {
        if (err) return;
    });
};



// hash password for securty sake, hashing is oneway(can't be retrieve the original value) where encryption is two way(encrypt and decrypt)
export const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    return hashedPassword;
};


export const createToken = (data, expiresIn = '24h') => {
    const jwt_key = process.env.JWT_SECRET;
    const payload = {
        date: Date.now(),
        ...data,
    };
    const token = jwt.sign(payload, jwt_key, { expiresIn});
    return token;
};


export const verifyUser = (req, res, next) => {
    const token = req.cookies.login_session || req.headers.authorization?.split(" ")[1];
    try {
        if (!token) return next(createError(401, "Token Missed"));
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedData;
        next();
    } catch (err) {
        next(createError(401, "You Are Not Authorized"));
    }
}

export const verifyHost = (req, res, next) => {
    const token = req.cookies.login_session || req.headers.authorization?.split(" ")[1];
    try {
        if (!token) return next(createError(401, "Token Missed"));
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);

        if (decodedData.role == 1 || decodedData.role == 2) {
            req.user = decodedData;
            next();
        }
        else {
            return next(createError(401, "You Are Not Authorized"));
        }
    } catch (err) {
        errorHandler(err, next);
    }
}

export const verifyAdmin = (req, res, next) => {
    const token = req.cookies.login_session || req.headers.authorization?.split(" ")[1];
    try {
        if (!token) return next(createError(401, "Token Missed"));
        const decodedData = jwt.verify(token, process.env.JWT_SECRET);

        if(decodedData.role == 1){
            req.user = decodedData;
            next();
        }else{
            return next(createError(401, "You Are Not Authorized"));
        }

    } catch (err) {
        next(createError(401, "You Are Not Authorized"));
    }
}