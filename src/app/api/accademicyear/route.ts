import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(req: NextRequest) {
  // Adjust the field name if your table uses a different one
  const result = await query('SELECT accademicYearName FROM accademicyear ORDER BY accademicYearName DESC');
  const years = result.map((row: any) => String(row.accademicYearName));
  return NextResponse.json(years);
} 