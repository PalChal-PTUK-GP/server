import nodemailer from 'nodemailer';
import { createError } from './utils.js';

export const sendEmail = async (to, subject, text, html = '', attachmentPath = '') => {

    try {
        const transporter = nodemailer.createTransport({
            service: process.env.EMAIL_SERVICE, // e.g., 'gmail', 'yahoo', etc.
            auth: {
                user: process.env.EMAIL_USER, // Your email address
                pass: process.env.EMAIL_PASS, // Your email password
            },
        })

        await transporter.sendMail({
            from: `${process.env.APP_NAME} <${process.env.EMAIL_USER}>`, // Must match the user in the auth object
            to,
            subject,
            text,
            html:`<p> ${text} </p><br> ${html}`,
            attachments: attachmentPath
                ? [
                    {
                        filename: attachmentPath.split('/').pop(),
                        path: attachmentPath,
                    },
                ]
                : [],
        });
    } catch (error) {
        throw createError(500, 'Error creating email transporter', error);
    }
}