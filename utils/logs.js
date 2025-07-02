import fs from 'fs';
import path from 'path';

export const writeLog = (message) => {
    const uploadDir = process.env.UPLOAD_DIR;
    const logsDir = path.join(uploadDir, 'logs');
    const logMessage = `${new Date().toISOString()} - ${message}\n`;
    const fileName = (new Date()).getFullYear() + '-' + (new Date()).getMonth() + '-' + (new Date()).getDate() + '.log';

    // Ensure the logs directory exists
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true }); // Create the directory if it doesn't exist
    }

    const filePath = path.join(logsDir, fileName);

    fs.appendFile(filePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to log file:', err);
        } else {
            console.log('Log written successfully!');
        }
    });
}