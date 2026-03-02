import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Mock user ID for the prototype
const MOCK_USER_ID = 'default-user-id';

export async function GET() {
    try {
        const events = await prisma.trackedEvent.findMany({
            where: { userId: MOCK_USER_ID },
            orderBy: { createdAt: 'desc' },
        });
        return NextResponse.json(events);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { keyword, description, eventDate, endDate, startSeverity, endSeverity } = body;

        if (!keyword) {
            return NextResponse.json({ error: 'Keyword is required' }, { status: 400 });
        }

        // Ensure the mock user exists
        const user = await prisma.user.upsert({
            where: { id: MOCK_USER_ID },
            update: {},
            create: {
                id: MOCK_USER_ID,
                email: 'mockuser@example.com',
                name: 'Mock User',
            },
        });

        const newEvent = await prisma.trackedEvent.create({
            data: {
                userId: user.id,
                keyword,
                description,
                ...(eventDate && { eventDate: new Date(eventDate) }),
                ...(endDate && { endDate: new Date(endDate) }),
                ...(startSeverity !== undefined && { startSeverity: Number(startSeverity) }),
                ...(endSeverity !== undefined && { endSeverity: Number(endSeverity) }),
            },
        });

        return NextResponse.json(newEvent, { status: 201 });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 });
    }
}
