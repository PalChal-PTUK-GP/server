
import PaymentsRoute from './payments.js'
import UsersRoute from './users.js'
import ReservationRoute from './reservations.js'
import PropertiesRoute from './properties.js'
import AuthRoute from './auth.js'
import citiesRoute from './cities.js'
import regionsRoute from './regions.js'
import amenitiesRoute from './amenities.js'
import reviewsRoute from './reviews.js'
import WishListRoute from './wishlist.js'
import MessagesRoute from './messages.js'
import ConversationsRoute from './conversations.js'
import NotificationRoute from './notifications.js'
import ReportsRoute from './reports.js'
import HostRequestsRoute from './hostRequests.js'
import adminRoute from './admin.js'

export const initRoutes = (app) => {
    app.use('/api/users', UsersRoute);
    app.use('/api/properties', PropertiesRoute);

    app.use('/api/cities', citiesRoute);
    app.use('/api/regions', regionsRoute);
    app.use('/api/amenities', amenitiesRoute);
    app.use('/api/reviews', reviewsRoute);
    app.use('/api/wishlist', WishListRoute);

    app.use('/api/payments', PaymentsRoute);
    app.use('/api/reservations', ReservationRoute);
    app.use("/api/auth", AuthRoute);

    app.use('/api/messages', MessagesRoute);
    app.use('/api/conversations', ConversationsRoute);
    app.use('/api/notifications', NotificationRoute);

    app.use("/api/reports", ReportsRoute);
    app.use('/api/hostRequests', HostRequestsRoute);
    app.use('/api/admin', adminRoute);
}