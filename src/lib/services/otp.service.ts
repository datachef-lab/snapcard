import {dbPostgres} from "@/lib/db/index";
import { otpTable, type Otp } from "@/lib/db/schema";
import { eq, and, gt, lt, desc } from "drizzle-orm";
import { findUserByEmail, findUserByPhone } from "./user.service";
import { sendZeptoMail } from "../notifications/zepto-mailer";
import { sendWhatsAppMessage } from "../notifications/interakt-messaging";

// Validate OTP code format
function isValidOtpCode(code: string): boolean {
    return /^\d{6}$/.test(code);
}

export async function createOtp(text: string) {
    // Find user by email or WhatsApp
    let user = await findUserByEmail(text);
    if (!user) {
        user = await findUserByPhone(text);
        if (!user) {
            return { success: false, message: "User not found" };
        }
    }

    // Check if user is active
    if (!user.isActive) {
        return { success: false, message: "User account is inactive" };
    }

    // Check if user has an active OTP
    const activeOtp = await findValidOtpByUserId(user.id);
    if (activeOtp) {
        return { success: false, message: "Active OTP already exists" };
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Create new OTP with 10 minutes expiry
    const result = await dbPostgres.insert(otpTable).values({
        userId: user.id,
        code,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000), // 10 minutes expiry
    }).returning();

    // Send notifications
    try {
        if (user.email) {
            await sendZeptoMail(user.email, "Your OTP is " + code, "Your OTP is " + code);
        }
        await sendWhatsAppMessage(user.phone, [code], "logincode");
    } catch (error) {
        // If notification fails, delete the OTP and return error
        // await deleteOtp(result[0].id);
        console.error("Failed to send OTP notification:", error);
        return { success: false, message: "Failed to send OTP notification" };
    }

    return { success: true, data: result[0] };
}

export async function findOtpById(id: number) {
    const result = await dbPostgres.select().from(otpTable).where(eq(otpTable.id, id));
    return result[0];
}

export async function findValidOtpByUserId(userId: number) {
    const now = new Date();
    const result = await dbPostgres
        .select()
        .from(otpTable)
        .where(and(eq(otpTable.userId, userId), gt(otpTable.expiresAt, now)))
        .orderBy(desc(otpTable.createdAt));
    return result[0];
}

export async function findOtpByCode(code: string) {
    if (!isValidOtpCode(code)) {
        return null;
    }
    const result = await dbPostgres.select().from(otpTable).where(eq(otpTable.code, code));
    return result[0];
}

export async function updateOtp(id: number, data: Partial<Omit<Otp, "id" | "createdAt" | "updatedAt">>) {
    const result = await dbPostgres
        .update(otpTable)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(otpTable.id, id))
        .returning();
    return result[0];
}

export async function deleteOtp(id: number) {
    const result = await dbPostgres.delete(otpTable).where(eq(otpTable.id, id)).returning();
    return result[0];
}

export async function deleteExpiredOtps() {
    const now = new Date();
    const result = await dbPostgres
        .delete(otpTable)
        .where(lt(otpTable.expiresAt, now))
        .returning();
    return result;
}

export async function findAllOtps() {
    return await dbPostgres.select().from(otpTable);
}

export async function verifyOtp(userId: number, code: string) {
    try {
        if (!isValidOtpCode(code)) {
            return { success: false, message: "Invalid OTP format" };
        }

        // Find the OTP
        const otp = await findOtpByCode(code);
        if (!otp) {
            return { success: false, message: "Invalid OTP code" };
        }

        // // Check if OTP belongs to the user
        if (otp.userId != userId) {
            return { success: false, message: "Invalid OTP for this user" };
        }

        // Check if OTP is expired
        if (otp.expiresAt < new Date()) {
            // Delete expired OTP
            await deleteOtp(otp.id);
            return { success: false, message: "OTP has expired" };
        }

        // Delete the OTP after successful verification
        await deleteOtp(otp.id);

        return { success: true, message: "OTP verified successfully" };
    } catch (error) {
        console.error("Error verifying OTP:", error);
        return { success: false, message: "Failed to verify OTP" };
    }
} 