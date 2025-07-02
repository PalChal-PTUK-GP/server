const emailHTMLFooter = `
    <p>Note: This is an automated email, please do not reply.</p>
    <p>For More Information Don't Hesitate To contact us on ${process.env.INFO_EMAIL}</p>
    <p>Thank you</p>
    
    <p style="margin-top:40px; font-weight:bold">${process.env.APP_NAME}</p>
    <p>Palestine, Tulkarm</p>
    <p>Phone: +970 59836798</p>
`

export const resetPasswordHTML = (user, link) =>
    `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;direction: ltr;">

        <h1>Reset Password</h1>
        <p> Dear <span style="font-weight:bold"> ${user.fullName},<span></p>

        <p>Click the link below to reset your password:</p>
        <div style="display: flex; align-items: center; justify-content: center; margin-top: 40px; margin-bottom: 40px;">
            <a href="${link}" style="font-size:18px;background-color:#8DD3BB; padding:10px 20px; text-decoration:none; color:white; border-radius: 10px; margin-right:30px">Reset Password</a>
            <p style="color:#8D99AE; ">This link will expire in 1 hour.</p>
        </div>

        <p>If you did not request this, please ignore this email.</p>
        
        
        ${emailHTMLFooter}
    </div>
    
`;

export const verifyEmailRequestHTML = (user, link) =>
    `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;direction: ltr;">

        <h1>Verify You Email</h1>
        <p> Dear <span style="font-weight:bold"> ${user.fullName},<span></p>

        <p>Click the link below Verify Your Email On PalChal</p>
        <div style="display: flex; align-items: center; justify-content: center; margin-top: 40px; margin-bottom: 40px;">
            <a href="${link}" style="font-size:18px;background-color:#8DD3BB; padding:10px 20px; text-decoration:none; color:white; border-radius: 10px; margin-right:30px">
                Verify Email
            </a>
            <p style="color:#8D99AE; ">This link will expire in 1 hour.</p>
        </div>

        <p>If you did not request this, please ignore this email.</p>
       
        ${emailHTMLFooter}
    </div>
    
`;

export const requestToBecomeHostHTML = (user) =>
    `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;direction: ltr;">

        <h1>Request To Become Host</h1>
        <p> Dear <span style="font-weight:bold"> ${user.fullName},<span></p>

        <p>Your request to become a host has been received. We will contact you soon.</p>
        
        
        ${emailHTMLFooter}
`;

export const successPaymentHTML = (reservation, user) => `
    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;direction: ltr;">

        <h1>Payment Successful</h1>
        <p> Dear ${reservation.userId.fullName}</p>

        <p>Your payment has been successfully processed. Thank you for your transaction.</p>
        <a href="${process.env.APP_URL}/reservationDetails/${reservation._id}">
        View Reservation
        </a>
        <h3>Reservation Details:</h3>
        <ul>
            <li><strong>Property:</strong> ${reservation.propertyId.title}</li>
            <li><strong>Start Date:</strong> ${new Date(reservation.startDate).toLocaleDateString()}</li>
            <li><strong>End Date:</strong> ${new Date(reservation.endDate).toLocaleDateString()}</li>
            <li><strong>Total Fee:</strong> $${reservation.totalFee.toFixed(2)}</li>
            <li><strong>Status:</strong> ${'confirmed'}</li>
        </ul>


        <p>We appreciate your business and look forward to serving you again.</p>


      ${emailHTMLFooter}
    </div>

`;


export const newReservationPlacedHTML = (reservation) => `

    <div style="font-family: Arial, sans-serif; font-size: 16px; color: #333;direction: ltr;">
        
        ${reservation.propertyId.numberOfReservations == 1 ?
        `<h1>Congratulations! Your Property is Now Live</h1>` :
        `<h1>New Reservation Placed</h1>`
        }
    
        <p> Dear ${reservation.propertyId.owner.fullName},</p>

        <p>A new reservation has been placed for your property: ${reservation.propertyId.title}.</p>
        <a href="${process.env.APP_URL}/reservationDetails/${reservation._id}">
        View Reservation
        </a>
        <h3>Reservation Details:</h3>
        <ul>
            <li><strong>Guest:</strong> ${reservation.userId.fullName}</li>
            <li><strong>Start Date:</strong> ${new Date(reservation.startDate).toLocaleDateString()}</li>
            <li><strong>End Date:</strong> ${new Date(reservation.endDate).toLocaleDateString()}</li>
            <li><strong>Total Fee:</strong> $${reservation.totalFee.toFixed(2)}</li>
            <li><strong>Status:</strong> ${'confirmed'}</li>
        </ul>

        <p>Please review the reservation details and take any necessary actions.</p>

        ${emailHTMLFooter}

    </div>
`