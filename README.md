# Graduation Project API (Online Chalet Booking System)
---

## API Documentation

| **BaseURL: https://hostname**|
|--------------------------------|

<!-- authentication Routes  -->

#### Authentication Routes

|Path: /api/auth|
|-----------------------------|

|   Sub Path     |    Method    | description |
|----------------|--------------|-------------|
| /register      |      POST     | add new user to the system |
| /login         |      POST     | login to the system |
| /logout        |      POST     | logout from the system by removing the token |


#### Properties Routes

|Path: /api/properties|
|-----------------------------|

|   Sub Path     |    Method    | description |
|----------------|--------------|-------------|
| /addProperty      |      POST     | add new Property to the system by host or admin|
| /:propertyId         |      PATCH     | update property info by the owner only |
| /:propertyId        |      DELETE     | delete a property by admin or owner |
| /:propertyId        |      GET     | get single property details by id |
| /:page/:limit        |      GET     | get set of properties using pagaination roles page number and limit |
| /search/:page/:limit?searchQuery      |      GET     | get set of properties info with filteration query applied |


#### payments Routes

|Path: /api/payments|
|-----------------------------|

|   Sub Path     |    Method    | description |
|----------------|--------------|-------------|
| /create-payment-intent     |      POST     | create new reservation for specified property and period create payment intent and bind it with that reservation making it ready to be paid the status in the end of this stage is pending for reservation |
| /cancel         |      POST     | cancel the payment intent and make the reservation status canceled |
| /:paymentIntentId        |      GET     | get the details of payment intent only admin allowed to access this route |
| /webhook        |      POST     | update the data depending on the events coming from stripe. ex: when a payment intent paid successfully it update the reservation to confirmed |


#### Reviews Routes

|Path: /api/reviews|
|-----------------------------|

|   Sub Path     |    Method    | description |
|----------------|--------------|-------------|
| /     |      POST     |  - add a review to the reservation.<br> - only one review allowed. <br> - only user can add the review.<br> - admin can't add review. <br> - only at most after 7 days of finished status. |
| /:id      |      PUT     | update the review comment, rating or both. at most after 7 days of finished status |
| /:id    |      DELETE     | delete the review. after at most 7 days for users, unlimited for admins  |
| /propertyReviews/:propertyId        |      GET     | get all reviews related to the specified property id |
| /:reservationId     |      GET     |  get the review related to the specified reservation id by the owner or the admin only|
