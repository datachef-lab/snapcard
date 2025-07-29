import { downloadIdCardDetailsByDate } from '@/app/dashboard/reports/action';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');

  if (!date) {
    return new NextResponse('Missing date', { status: 400 });
  }

  try {
    const buffer = await downloadIdCardDetailsByDate(date);

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="id-cards-${date}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('❌ Error generating Excel:', err);
    return new NextResponse('Failed to generate Excel', { status: 500 });
  }
}
