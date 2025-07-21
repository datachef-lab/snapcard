import { NextRequest, NextResponse } from "next/server";
import { pusher } from "@/lib/pusher";

let onlineUsers: { name: string; email: string; type: string }[] = [];

export async function POST(req: NextRequest) {
  const user = await req.json();
  if (!onlineUsers.find(u => u.email === user.email)) {
    onlineUsers.push(user);
    await pusher.trigger("reports", "active-users-update", { users: onlineUsers });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const user = await req.json();
  onlineUsers = onlineUsers.filter(u => u.email !== user.email);
  await pusher.trigger("reports", "active-users-update", { users: onlineUsers });
  return NextResponse.json({ success: true });
} 