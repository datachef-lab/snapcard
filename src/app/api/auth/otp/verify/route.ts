import { NextResponse } from "next/server";
import * as otpService from "@/lib/services/otp.service";
import { findUserByEmail, findUserByPhone } from "@/lib/services/user.service";
import { generateTokens } from "@/lib/services/auth.service";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text, code } = body;

        console.log(text, code)

        if (!text) {
            return NextResponse.json(
                { success: false, message: "Phone or email is required" },
                { status: 400 }
            );
        }

        if (!code) {
            return NextResponse.json(
                { success: false, message: "OTP code is required" },
                { status: 400 }
            );
        }

        // Find user by email or WhatsApp
        let user = await findUserByEmail(text);
        if (!user) {
            user = await findUserByPhone(text);
            if (!user) {
                return NextResponse.json(
                    { success: false, message: "User not found" },
                    { status: 404 }
                );
            }
        }

        const result = await otpService.verifyOtp(user.id, code);

        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        const tokens = generateTokens(user);

        const response = NextResponse.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
            },
            accessToken: tokens.accessToken,
        });

        // Set cookies
        response.cookies.set({
            name: 'refreshToken',
            value: tokens.refreshToken,
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
            path: '/',
        });

        response.cookies.set({
            name: 'accessToken',
            value: tokens.accessToken,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes in seconds
            path: '/',
        });

        return response;

    } catch (error) {
        console.error("Error in POST /api/otp/verify:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}