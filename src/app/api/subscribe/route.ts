import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Subscriber from '@/lib/models/Subscriber';

export async function POST(request: Request) {
    try {
        const { name, email, phone } = await request.json();

        // Basic validation
        if (!name || !email) {
            return NextResponse.json(
                { error: 'Name and email are required' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if subscriber already exists (optional but good practice)
        // For now, adhering to simple requirement of just "capturing" data.
        // Creating the new subscriber
        const subscriber = await Subscriber.create({
            name,
            email,
            phone,
        });

        return NextResponse.json({ success: true, data: subscriber });
    } catch (error) {
        console.error('Subscription error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
