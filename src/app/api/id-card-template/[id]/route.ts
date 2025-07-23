import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = (await params).id;
  const filePath = path.join(process.env.SNAPCARD_IMAGE_BASE_PATH || '', 'templates', `${id}.jpeg`);
  try {
    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `inline; filename="${id}.jpeg"`,
      },
    });
  } catch {
    return new NextResponse('Not found', { status: 404 });
  }
} 