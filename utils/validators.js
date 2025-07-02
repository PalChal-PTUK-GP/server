export const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}


/**
 * 
 * @param {*} password 
 * @returns boolean
 * @description 
 *  Validate password according to the following rules:
 * - At least 8 characters long
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (e.g., @, $, !, %, *, ?, &)
 * - No whitespace allowed 
 * 
 */
export const validatePassword = (password) => {
    // Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one number, and one special character
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    return regex.test(password);
}


export const validateUsername = (username) => {
    // Username must be at least 2 characters long and can only contain letters, numbers, and underscores
    const regex = /^[a-zA-Z0-9_]{2,20}$/;
    return regex.test(username);
}