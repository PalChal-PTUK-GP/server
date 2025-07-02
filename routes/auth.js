import express from 'express';
import { register, login, logout, forgetPassword, resetPassword, changePassword, isActiveToken, verifyEmail, verifyEmailRequest } from '../controllers/auth.js';
import { verifyUser } from '../utils/utils.js';


const router = express.Router();

/**
 * @desc Register a new user
 * @route POST /api/auth/register
 * @access Public
 */
router.post('/register', register);

/**
 * @desc Login a user
 * @route POST /api/auth/login
 * @access Public
 */
router.post('/login', login);

/**
 * @desc Logout a user
 * @route POST /api/auth/logout
 * @access Public
 */
router.post('/logout', logout);

/**
 * @description Reset password path for the user by sending a reset password email containing a link with a token
 * @route GET /api/auth/forgetPassword
 * @access Public
 * @body {email}
 * @returns {message} Reset Password Email Sent Successfully
 * @throws {error} If the email is not provided or if the user is not found
 */
router.post('/forgetPassword/', forgetPassword);


/**
 * * @description Reset password path for the user by sending a reset password email containing a link with a token
 * * @route POST /api/auth/resetPassword
 * * @access Public
 * * @body {password, token}
 * * @returns {message} Password Reset Successfully
 * * @throws {error} If the password is not provided or if the token is not valid
 */
router.post('/resetPassword', resetPassword);


/**
 * * @description Change the user's password from the profile page
 * * * @route POST /api/auth/changePassword
 * * * @access User
 * * * @body {oldPassword, newPassword}
 * * * @returns {message} Password Changed Successfully
 * * * @throws {error} If the old password is not provided or if the new password is not provided or if the old password is incorrect
 */
router.post('/changePassword', verifyUser, changePassword)


/**
 * * @description Check if the token is valid , for the reset password link so that the user can reset their password twice using the same token
 * * @route GET /api/auth/isActiveToken/:token
 * * @access Public
 * * @params {token}
 * * @returns {message} valid or invalid
 * * @throws {error} If the token is not valid or expired
 */
router.get('/isActiveToken/:token', isActiveToken);


/**
 * @description send Email to the users contains a link with token to verify their email, only one time , after that the user can't verify their email again
 * @route GET /api/auth/verifyEmailRequest
 * @access Public
 * @body {email}
 * @returns {message} Email verification link sent successfully
 * @throws {error} If the email is not provided or if the user is not found or if the email is already verified
 */
router.get('/verifyEmailRequest', verifyUser, verifyEmailRequest);


/**
 * @description Verify the user's email using the token sent to their email, only one time , after that the user can't verify their email again
 * * @route POST /api/auth/verifyEmail
 * * @access Public
 * * @body {token}
 * * @returns {message} Email verified successfully
 * * @throws {error} If the token is not valid or expired or if the user is not found or if the email is already verified
 */
router.post("/verifyEmail", verifyEmail);

export default router;