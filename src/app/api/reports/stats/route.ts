import { NextRequest, NextResponse } from 'next/server';
import { getStats, getHourlyStats, getAdmissionYears } from '@/lib/services/reports.service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const date = searchParams.get('date');
  const admissionYears = await getAdmissionYears();
  if (!year || !date) {
    return NextResponse.json({ success: false, error: 'Missing year or date', admissionYears }, { status: 400 });
  }
  const stats = await getStats(year, date);
  const hourly = await getHourlyStats(date);
  return NextResponse.json({ success: true, stats, hourly, admissionYears });
} 