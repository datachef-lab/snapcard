import { NextRequest, NextResponse } from 'next/server';
import { pusher } from '@/lib/pusher';

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const socketId = formData.get('socket_id') as string;
  const channel = formData.get('channel_name') as string;
  const user_id = formData.get('user_id') as string;
  const user_info = formData.get('user_info') as string;

  console.log('Pusher Auth Params:', { socketId, channel, user_id, user_info });

  if (!socketId || !channel || !user_id) {
    return NextResponse.json({ error: `Missing required params: socketId=${socketId}, channel=${channel}, user_id=${user_id}` }, { status: 400 });
  }

  const auth = pusher.authenticate(socketId, channel, {
    user_id,
    user_info: user_info ? JSON.parse(user_info) : {},
  });

  return NextResponse.json(auth);
} 