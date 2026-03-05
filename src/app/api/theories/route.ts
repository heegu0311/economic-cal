import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const theories = await prisma.economicTheory.findMany({
            orderBy: { order: 'asc' },
        });
        return NextResponse.json(theories);
    } catch (error) {
        console.error('Failed to fetch theories:', error);
        return NextResponse.json({ error: 'Failed to fetch theories' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { title, description, order } = body;

        const theory = await prisma.economicTheory.create({
            data: {
                title,
                description,
                order: order || 0,
            },
        });

        return NextResponse.json(theory);
    } catch (error) {
        console.error('Failed to create theory:', error);
        return NextResponse.json({ error: 'Failed to create theory' }, { status: 500 });
    }
}
