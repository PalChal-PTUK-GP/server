// General utilities
export {
    createError,
    errorHandler,
    deleteUploadedFiles,
    deleteFile,
    hashPassword,
    createToken,
    verifyUser,
    verifyHost,
    verifyAdmin,
} from "./utils.js";

// Email utilities
export { sendEmail } from "./emailService.js";
export { resetPasswordHTML, verifyEmailRequestHTML, requestToBecomeHostHTML } from "./mailsContent.js";

// Validation utilities
export { validatePassword, validateEmail, validateUsername } from "./validators.js";

// Stripe event handlers
export {
    handlePaymentIntentCreated,
    handlePaymentIntentSucceeded,
    handlePaymentIntentFailed,
    handlePaymentIntentCanceled,
    handlePaymentMethodAttached,
    handleRefundCreated,
    handleChargeRefunded,
} from "./stripeEventsHandlers.js";



// File upload utilities
export { upload } from "./uploadConfig.js"; // Rename this file to multer.js if necessary

// Socket.io utilities
export { initSocketIO, sendNotificationToUser } from "./socketIO.js";

// notification utilities
export {
    createOneUserNotification,
    createMultipleUserNotifications
} from "./notifications.js";

export {
    newPropertyCreated
} from "./notificationsContent.js";


// date utilities
export { getDateUTC } from "./date.js";