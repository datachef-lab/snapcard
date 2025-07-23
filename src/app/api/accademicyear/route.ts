import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(_req: NextRequest) {
  console.log(_req)
  // Adjust the field name if your table uses a different one
  const result = await query('SELECT accademicYearName FROM accademicyear ORDER BY accademicYearName DESC');
  const years = result.map(row => String((row as { accademicYearName: string }).accademicYearName));
  return NextResponse.json(years);
} 