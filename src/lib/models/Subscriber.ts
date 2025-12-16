import mongoose from 'mongoose';

export interface ISubscriber extends mongoose.Document {
    name: string;
    email: string;
    phone?: string;
    createdAt: Date;
}

const SubscriberSchema = new mongoose.Schema<ISubscriber>({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        maxlength: [60, 'Name cannot be more than 60 characters'],
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Please provide a valid email',
        ],
    },
    phone: {
        type: String,
        maxlength: [20, 'Phone number cannot be more than 20 characters'],
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export default mongoose.models.Subscriber || mongoose.model<ISubscriber>('Subscriber', SubscriberSchema);
