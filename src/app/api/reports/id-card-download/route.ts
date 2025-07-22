import { downloadIdCardDetails } from '@/app/dashboard/reports/action';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get('date');
  const hour = searchParams.get('hour');

  if (!date || !hour) {
    return new NextResponse('Missing date or hour', { status: 400 });
  }

  try {
    const buffer = await downloadIdCardDetails(date, parseInt(hour));

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="id-cards-${date}-${hour}.xlsx"`,
      },
    });
  } catch (err) {
    console.error('❌ Error generating Excel:', err);
    return new NextResponse('Failed to generate Excel', { status: 500 });
  }
}
