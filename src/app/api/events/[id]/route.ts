import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.trackedEvent.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();

        const updatedEvent = await prisma.trackedEvent.update({
            where: { id },
            data: {
                keyword: body.keyword,
                description: body.description,
                eventDate: new Date(body.eventDate),
                endDate: new Date(body.endDate),
                startSeverity: body.startSeverity,
                endSeverity: body.endSeverity,
            },
        });

        return NextResponse.json(updatedEvent);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update event' }, { status: 500 });
    }
}
