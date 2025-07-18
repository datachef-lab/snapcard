import { NextResponse } from "next/server";
import { verifyRefreshToken, generateTokens } from "@/lib/services/auth.service";
import { findUserById } from "@/lib/services/user.service";

export async function GET(request: Request) {
    try {
        // Get the refresh token from request cookies
        const cookieHeader = request.headers.get('cookie');
        console.log('[auth/me] Cookie header:', cookieHeader);

        if (!cookieHeader) {
            console.log('[auth/me] No cookie header found');
            return NextResponse.json(
                { error: "No cookies found" },
                { status: 401 }
            );
        }

        // Parse cookies
        const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) {
                acc[key] = decodeURIComponent(value);
            }
            return acc;
        }, {} as Record<string, string>);

        console.log('[auth/me] Parsed cookies:', cookies);
        const refreshToken = cookies['refreshToken'];
        console.log('[auth/me] Refresh token:', refreshToken);

        if (!refreshToken) {
            console.log('[auth/me] No refresh token found in cookies');
            return NextResponse.json(
                { error: "No refresh token found" },
                { status: 401 }
            );
        }

        // Verify the refresh token
        console.log('[auth/me] Verifying refresh token...');
        const payload = verifyRefreshToken(refreshToken);
        console.log('[auth/me] Token payload:', payload);

        if (!payload) {
            console.log('[auth/me] Invalid refresh token');
            return NextResponse.json(
                { error: "Invalid refresh token" },
                { status: 401 }
            );
        }

        // Get user details
        console.log('[auth/me] Looking up user with ID:', payload.userId);
        const user = await findUserById(payload.userId);
        console.log('[auth/me] Found user:', user);

        if (!user) {
            console.log('[auth/me] User not found for ID:', payload.userId);
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        // Generate new tokens
        console.log('[auth/me] Generating new tokens...');
        const tokens = generateTokens(user);

        const response = NextResponse.json({
            accessToken: tokens.accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
            },
        });

        // Set new cookies
        console.log('[auth/me] Setting new cookies...');
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

        console.log('[auth/me] Successfully completed session check');
        return response;
    } catch (error) {
        console.error("[auth/me] Error in /api/auth/me:", error);
        return NextResponse.json(
            { error: "Failed to verify session" },
            { status: 500 }
        );
    }
} 