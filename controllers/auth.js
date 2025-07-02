import User from "../models/User.js";
import { createError, createOneUserNotification, createToken, errorHandler, hashPassword } from "../utils/index.js";
import { validatePassword } from "../utils/index.js";
import { sendEmail } from '../utils/index.js';
import { resetPasswordHTML, verifyEmailRequestHTML } from '../utils/index.js';
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import { createStripeCustomer } from "../utils/stripe.js";

/**
 * 
 * @description Register a new user
 * @returns {String} successfully registered message
 * @throws {Error} if username or email already exists
 */
export const register = async (req, res, next) => {

    const { username, fullName, mobile, email, password, countryCode } = req.body;

    try {
        // validation code will be moved to the mongoose model validation

        if (validatePassword(password) === false) {
            throw createError(400, "Password must contain at least 8 characters, including at least 1 letter and 1 number And 1 special character");
        }

        const hashedPassword = await hashPassword(req.body.password);

        const newUser = new User({
            username,
            fullName,
            mobile,
            countryCode,
            email,
            password: hashedPassword,
        })

        await newUser.save(); // save the user to the database
        createOneUserNotification(newUser._id, "Welcome To PalChal", "You have successfully registered to the app"); // send notification to the user

        res.status(201).json({ message: "User Created Successfully, Please Login To Start Using The App" });

    } catch (err) {
        errorHandler(err, next);
    }

}


/**
 * 
 * @description Login a user
 * @returns {String} Token
 * @throws {Error} if username or password is incorrect
 * @throws {Error} if user not found
 */

export const login = async (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    try {

        if (username === "" || password === "") {
            throw createError(401, "Username and Password are required");
        }

        const user = await User.findOne({ username });

        if (user === null) {
            throw createError(401, "User not found");
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            throw createError(401, "Username or Password is incorrect");
        }

        if (user.status === 'suspended') {
            throw createError(403, "Your account has been suspended. Please contact support.");
        }

        const token = createToken({ id: user._id, username: user.username, role: user.role });

        const { password: pass, ...userInfo } = user._doc;

        // change false to true in production
        res.cookie("login_session", token, { httpOnly: true, secure: false, maxAge: 24 * 60 * 60 * 1000 }).status(200).json({ userInfo, token });

    } catch (err) {
        errorHandler(err, next);
    }
}


/**
 * 
 * @description Logout a user
 * @returns {String} successfully logged out message
 * @throws {Error} if user can't be logged out
 */
export const logout = (req, res, next) => {
    try {
        res.clearCookie("login_session").status(200).json({ message: "Logged Out Successfully" });
    } catch (err) {
        errorHandler(err, next);
    }

}


/**
 * @description Reset password path for the user by sending a reset password email containing a link with a token
 * @returns {String} Reset Password Email Sent Successfully
 * @throws {Error} if the email is not provided or if the user is not found
 */
export const forgetPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        const user = await User.findOne({ email })

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const token = createToken({ id: user._id, email: user.email }, '1h');

        const link = `${process.env.APP_URL}/resetPassword?token=${token}`;

        await sendEmail(user.email, 'Reset Password', '', resetPasswordHTML(user, link));

        res.status(200).json({ message: 'Reset Password Email Sent Successfully' });
    } catch (err) {
        errorHandler(err, next);
    }

}


/**
 * @description Reset password for the user using the token sent to their email
 * @returns {String} Password reset successfully message
 * @throws {Error} if the token is invalid or expired or if the password is not provided or if the user is not found
 */
export const resetPassword = async (req, res, next) => {
    const { token, password } = req.body;

    try {
        if (!token || !password) {
            throw createError(400, "Token and password are required");
        }

        const decodedData = jwt.verify(token, process.env.JWT_SECRET);

        if (!decodedData) {
            throw createError(400, "Invalid reset password tokens");
        }

        if (!validatePassword(password)) {
            throw createError(400, "Password must contain at least 8 characters, including at least 1 letter and 1 number And 1 special character");
        }

        const hashedPassword = await hashPassword(password);

        const user = await User.findById(decodedData.id);

        if (!user) {
            throw createError(404, "User not found");
        }

        if (user.passwordChangedAt > new Date(decodedData.date)) {
            throw createError(400, "Link Expired");
        }

        const afterUpdate = await User.findByIdAndUpdate(decodedData.id, { password: hashedPassword, passwordChangedAt: new Date() - 1000 }, { new: true });

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        errorHandler(err, next);
    }
}


/**
 * 
 * @description Change password for the user (it differ from reset password because the user is already logged in and must provide the current password)
 * @returns {String} Password changed successfully message
 * @throws {Error} if the current password is incorrect or if the new password is the same as the current password or if the user is not found
 */
export const changePassword = async (req, res, next) => {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    try {
        if (!currentPassword || !newPassword) throw createError(400, "Please provide current password and new password.");

        const user = await User.findById(userId);

        const verifyCurrentPassword = await bcrypt.compare(currentPassword, user.password);
        if (!verifyCurrentPassword) throw createError(400, "Current password is incorrect.");

        if (currentPassword === newPassword) throw createError(400, "New password must be different from current password.");

        const hashedNewPassword = await hashPassword(newPassword);

        await User.updateOne({ _id: userId }, { password: hashedNewPassword, passwordChangedAt: new Date() - 1000 });

        res.status(200).json({ message: "Password changed successfully" });
    } catch (err) {
        errorHandler(err, next);
    }
}

/**
 * @description Check if the token is valid , for the reset password link so that the user can reset their password twice using the same token
 * add isActiveToken route to check if the token is valid, this used by the
 * front end when targeting the resetPassword Page to ensure that the token is active before showing the reset password form
 * @returns {String} valid or invalid message
 * @throws {Error} if the token is invalid or expired or if the user is not found
 */
export const isActiveToken = async (req, res, next) => {

    const { token } = req.params;

    try {
        if (!token) throw createError(400, "invalid");

        const decodedData = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decodedData.id);

        if (!user) throw createError(400, "invalid");

        if (user.passwordChangedAt > new Date(decodedData.date)) {
            throw createError(404, "invalid reset password token");
        }

        res.status(200).json({ message: "valid" });
    } catch (err) {
        errorHandler(err, next);
    }
};


/**
 * @description send Email to the users contains a link with token to verify their email, only one time , after that the user can't verify their email again
 * @returns {String} Email verification link sent successfully message
 * @throws {Error} if the email is not provided or if the user is not found or if the email is already verified
 */
export const verifyEmailRequest = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const user = await User.findById(userId);

        if (user.isEmailVerified) {
            throw createError(400, "Email already verified");
        }
        const token = createToken({ id: user._id }, '1h');

        const link = `${process.env.APP_URL}/verifyEmail?token=${token}`;

        await sendEmail(user.email, 'Verify Your Email', ``, verifyEmailRequestHTML(user, link));

        res.status(200).json({
            message: 'Verify Email Request Sent Successfully',
        });
    } catch (err) {
        errorHandler(err, next);
    }
}


/**
 * @description Verify the user's email using the token sent to their email, only one time , after that the user can't verify their email again
 * @returns {String} Email verified successfully message
 * @throws {Error} if the token is invalid or expired or if the user is not found or if the email is already verified
 */
export const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.body;
        if (!token) throw createError(400, "Token is required");

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) throw createError(400, "Invalid token");

        const user = await User.findById(decoded.id);
        if (!user) throw createError(404, "User not found");

        if (user.isEmailVerified) {
            throw createError(400, "Email already verified");
        }

        user.isEmailVerified = true;

        const stripeCustomer = await createStripeCustomer(user)
        user.stripeCustomerId = stripeCustomer.id; // create stripe customer for the user

        user.emailVerifiedAt = new Date();

        await user.save();

        res.status(200).json({
            message: "Email verified successfully",
        });
    } catch (err) {
        errorHandler(err, next);
    }
}