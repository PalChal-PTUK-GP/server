export const newPropertyCreated = (title, id) => `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;direction: ltr; display: flex; align-items: center; justify-content: space-between">
        Your property ${title} has been added successfully.
        <a href="/singleProperty/${id}" style="color:blue; margin-left:auto">View</a>
    </div>
`


export const successPaymentNotification = (reservation) => `
    Your payment for the reservation at <strong> ${reservation.propertyId.title}</strong> has been successfully processed.
    <a href="${process.env.APP_URL}/reservationDetails/${reservation._id}" style={color:blue; text-decoration:underline}>View Reservation</a>
`


export const hostNewReservationNotification = (reservation) => `
    New reservation has been placed for your property <strong>${reservation.propertyId.title}</strong>.
    <a href="${process.env.APP_URL}/reservationDetails/${reservation._id}" style="color:blue; text-decoration:underline">View Reservation</a>
`