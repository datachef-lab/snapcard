import { NextRequest, NextResponse } from 'next/server';
import { getStats, getAdmissionYears } from '@/lib/services/reports.service';
import { fetchIdCardStatsPerDate } from '@/app/dashboard/reports/action';

function toDDMMYYYY(dateStr: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [yyyy, mm, dd] = dateStr.split('-');
    return `${dd}-${mm}-${yyyy}`;
  }
  return dateStr;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year');
  const date = searchParams.get('date');
  const admissionYears = await getAdmissionYears();
  if (!year || !date) {
    return NextResponse.json({ success: false, error: 'Missing year or date', admissionYears }, { status: 400 });
  }
  const stats = await getStats(year, toDDMMYYYY(date));
  const dateStats = await fetchIdCardStatsPerDate(year, toDDMMYYYY(date));
  console.log("in reports stats:", stats, dateStats, admissionYears)
  return NextResponse.json({ success: true, stats, dateStats, admissionYears });
} 