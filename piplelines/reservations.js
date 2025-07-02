export const getPaginatedReservations = (filters, skip, limit) => [
    {
        $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "userId"
        }
    }, {
        $unwind: "$userId"
    },
    {
        $lookup: {
            from: "properties",
            localField: "propertyId",
            foreignField: "_id",
            as: "propertyId"
        }
    }, {
        $unwind: "$propertyId"
    },
    {
        $lookup: {
            from: "users",
            localField: "propertyId.owner",
            foreignField: "_id",
            as: "propertyId.owner"
        }
    }, {
        $unwind: "$propertyId.owner"
    },
    {
        $match: filters
    },
    {
        $facet: {
            totalDocs: [{ $count: "count" }],
            reservations: [
                {
                    $sort: { createdAt: -1 } // Sort by createdAt in descending order
                }, {
                    $skip: skip // Skip the documents for pagination
                }, {
                    $limit: limit // Limit the number of documents returned
                }, {
                    $project: {
                        _id: 1,
                        userId: {
                            _id: "$userId._id",
                            username: "$userId.username",
                            fullName: "$userId.fullName",
                            email: "$userId.email",
                            mobile: "$userId.mobile",
                            profilePictureURL: "$userId.profilePictureURL"
                        },
                        propertyId: {
                            _id: "$propertyId._id",
                            title: "$propertyId.title",
                            thumbnailURL: "$propertyId.thumbnailURL",
                            owner: {
                                _id: "$propertyId.owner._id",
                                username: "$propertyId.owner.username",
                                fullName: "$propertyId.owner.fullName",
                                email: "$propertyId.owner.email",
                                mobile: "$propertyId.owner.mobile",
                                profilePictureURL: "$propertyId.owner.profilePictureURL"
                            },
                            rentFee: { $toDouble: "$propertyId.rentFee" },
                            address: "$propertyId.address"
                        },
                        status: 1,
                        startDate: 1,
                        endDate: 1,
                        totalFee: { $toDouble: "$totalFee" },
                        userPoints: 1,
                        hostPoints: 1,
                        paymentToken: 1,
                        createdAt: 1
                    }
                }
            ]
        }
    }
]