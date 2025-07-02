import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY); // Use your Stripe secret key

export const createStripeCustomer = async (user) => {
    try {
        const customer = await stripe.customers.create({
            name: user.username,
            email: user.email,
            address: user.address,
            phone: user.mobile,
            metadata: {
                userId: user._id.toString(), // Link the Stripe customer to your database user
            },
        });
        return customer;
    } catch (error) {
        return null;
    }
};


const getStripeCustomer = async (customerId) => {
    try {
        const customer = await stripe.customers.retrieve(customerId);
        return customer;
    } catch (error) {
        console.error('Error retrieving Stripe customer:', error);
        throw error;
    }
};


const updateStripeCustomer = async (customerId, updates) => {
    try {
        const updatedCustomer = await stripe.customers.update(customerId, updates);
        return updatedCustomer;
    } catch (error) {
        console.error('Error updating Stripe customer:', error);
        throw error;
    }
};


const deleteStripeCustomer = async (customerId) => {
    try {
        const deletedCustomer = await stripe.customers.del(customerId);
        return deletedCustomer;
    } catch (error) {
        console.error('Error deleting Stripe customer:', error);
        throw error;
    }
};