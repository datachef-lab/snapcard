import { NextRequest, NextResponse } from 'next/server';
import { updateRfid } from '@/lib/services/student.service';

export async function POST(req: NextRequest) {
  try {
    const { uid, rfid } = await req.json();
    if (!uid || !rfid) {
      return NextResponse.json({ error: 'Missing uid or rfid' }, { status: 400 });
    }
    const student = await updateRfid(uid, rfid);
    if (!student) {
      return NextResponse.json({ error: 'Student not found or update failed' }, { status: 404 });
    }
    return NextResponse.json({ student });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
} 