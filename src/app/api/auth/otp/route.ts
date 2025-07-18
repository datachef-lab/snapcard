import { NextResponse } from "next/server";
import * as otpService from "@/lib/services/otp.service";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const userId = searchParams.get("userId");
        const code = searchParams.get("code");

        if (id) {
            const otp = await otpService.findOtpById(Number(id));
            if (!otp) {
                return NextResponse.json({ success: false, message: "OTP not found" }, { status: 404 });
            }
            return NextResponse.json({ success: true, data: otp });
        }

        if (userId) {
            const otp = await otpService.findValidOtpByUserId(Number(userId));
            if (!otp) {
                return NextResponse.json({ success: false, message: "No valid OTP found" }, { status: 404 });
            }
            return NextResponse.json({ success: true, data: otp });
        }

        if (code) {
            const otp = await otpService.findOtpByCode(code);
            if (!otp) {
                return NextResponse.json({ success: false, message: "Invalid OTP code" }, { status: 404 });
            }
            return NextResponse.json({ success: true, data: otp });
        }

        const otps = await otpService.findAllOtps();
        return NextResponse.json({ success: true, data: otps });
    } catch (error) {
        console.error("Error in GET /api/otp:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { text } = body;

        console.log(text);

        if (!text) {
            return NextResponse.json(
                { success: false, message: "Email or WhatsApp number is required" },
                { status: 400 }
            );
        }

        const result = await otpService.createOtp(text);
console.log(result);
        if (!result.success) {
            return NextResponse.json(result, { status: 400 });
        }

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/otp:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
        }

        const body = await request.json();
        const otp = await otpService.updateOtp(Number(id), body);

        if (!otp) {
            return NextResponse.json({ success: false, message: "OTP not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: otp });
    } catch (error) {
        console.error("Error in PUT /api/otp:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        const deleteExpired = searchParams.get("deleteExpired");

        if (deleteExpired === "true") {
            const otps = await otpService.deleteExpiredOtps();
            return NextResponse.json({ success: true, data: otps });
        }

        if (!id) {
            return NextResponse.json({ success: false, message: "ID is required" }, { status: 400 });
        }

        const otp = await otpService.deleteOtp(Number(id));

        if (!otp) {
            return NextResponse.json({ success: false, message: "OTP not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: otp });
    } catch (error) {
        console.error("Error in DELETE /api/otp:", error);
        return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 500 });
    }
} 