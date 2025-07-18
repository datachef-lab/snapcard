import { NextRequest, NextResponse } from "next/server";
import { findUsers, createUser, findUserById, updateUser } from "@/lib/services/user.service";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    const user = await findUserById(Number(id));
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  }
  const users = await findUsers();
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const data = await req.json();
  const user = await createUser(data);
  if (!user) return NextResponse.json({ error: "User already exists or invalid data" }, { status: 400 });
  return NextResponse.json(user);
}

export async function PATCH(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  const data = await req.json();
  const user = await updateUser(Number(id), data);
  if (!user) return NextResponse.json({ error: "User not found or update failed" }, { status: 404 });
  return NextResponse.json(user);
} 