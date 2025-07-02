import Reservation from "../models/Reservation.js";

const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

export const getDateUTC = (date = new Date()) => {
    const utcDate = new Date(date);
    const utcOffset = utcDate.getTimezoneOffset() * 60000; // Convert minutes to milliseconds
    return new Date(utcDate.getTime() - utcOffset);
}

export const getLastMonths = (numberOfMonths) => {

    const now = new Date();
    const last6Months = [];
    for (let i = numberOfMonths; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        last6Months.push({
            year: date.getFullYear(),
            month: date.getMonth() + 1, // 1-based for monthNames
            monthName: monthNames[date.getMonth()]
        });
    }

    return last6Months;
}

export const isAvailableDates = async (startDate, endDate, propertyId, reservationId) => {
    if (startDate < Date.now()) {
        return false
    }

    let Reservations = await Reservation.find({
        _id: { $ne: reservationId }, // Exclude the current reservation if it exists
        propertyId,
        status: "confirmed",
        startDate: { $lt: endDate },
        endDate: { $gt: startDate },
    });

    Reservations = Reservations.filter((reservation) => {
        if (reservation.endDate == startDate && endDate > reservation.startDate) {
            return false;
        } else {
            return true;
        }
    })

    if (Reservations.length > 0) {
        return false;
    } else {
        return true;
    }
}