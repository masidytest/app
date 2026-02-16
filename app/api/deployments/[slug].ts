// Route /d/[slug] to correct project/version
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;
    const deployment = await prisma.deployment.findUnique({
      where: { slug },
      include: {
        project: true,
        version: true,
      },
    });
    if (!deployment) {
      return NextResponse.json({ error: 'Deployment not found' }, { status: 404 });
    }
    return NextResponse.json({ deployment });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to resolve deployment', details: String(error) }, { status: 500 });
  }
}
