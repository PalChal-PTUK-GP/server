import mongoose from "mongoose";
import dotenv from 'dotenv'

dotenv.config();

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        trim: true,
        unique: [true, 'Username already exists'],
        lowercase: true,
        validate: {
            validator: function (value) {
                return /^[a-zA-Z0-9_]+$/.test(value); // Only alphanumeric characters and underscores
            },
            message: props => `${props.value} is not a valid username!`
        }
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        trim: true,
        unique: [true, 'Email already exists'],
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        // validate: {
        //     validator: (value)=> validatePassword(value),
        //     message: (props) => `${props.value} is not a valid password!`,
        // },
    },
    // address: {
    //     city: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'City',
    //         required:[true, 'City is required']
    //     },
    //     region: {
    //         type: mongoose.Schema.Types.ObjectId,
    //         ref: 'Region',
    //         required: [true, 'Region is required']
    //     }
    // },
    mobile: {
        type: String,
        required: true
    },
    countryCode:{
        type: String,
        default: '970', // Default
        required: [true, 'Country code is required'],
    },
    profilePictureURL: {
        type: String,
        default: process.env.DEFAULT_PROFILE_IMAGE
    },
    status: {
        type: String,
        enum: {
            values: ['active', 'inactive', 'verified', 'suspended', 'deleted'],
            message: '{VALUE} is not supported'
        },
        default: 'active'
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    role: {
        type: Number,
        enum: {
            values: [1, 2, 3],    // 1: Admin, 2: Host, 3: Customer
            message: '{VALUE} is not supported'
        },
        default: 3
    },
    totalRewardPoints: {
        type: Number,
        default: 0
    },
    subscripedToNewsLetter: {
        type: Boolean,
        default: false
    },
    passwordChangedAt: {
        type: Date,
    },
    emailVerifiedAt:{
        type: Date,
    },
    stripeCustomerId: {
        type: String,
    },
}, { timestamps: true });

// Pre-save hook to update `passwordChangedAt` when the password is changed
UserSchema.pre('save', function (next) {
    if (!this.isModified('password') || this.isNew) {
        return next();
    }

    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure the token is issued after this timestamp
    next();
});

export default mongoose.model('User', UserSchema);