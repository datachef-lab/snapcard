import { NextResponse } from "next/server";
import * as userService from "@/lib/services/user.service";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const result = await userService.createUser(body);

        if (!result) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json({ success: true, data: result }, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/users:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}