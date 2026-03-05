import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        const body = await req.json();
        const { title, description, order } = body;

        const theory = await prisma.economicTheory.update({
            where: { id: params.id },
            data: {
                title,
                description,
                order,
            },
        });

        return NextResponse.json(theory);
    } catch (error) {
        console.error('Failed to update theory:', error);
        return NextResponse.json({ error: 'Failed to update theory' }, { status: 500 });
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        await prisma.economicTheory.delete({
            where: { id: params.id },
        });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to delete theory:', error);
        return NextResponse.json({ error: 'Failed to delete theory' }, { status: 500 });
    }
}
