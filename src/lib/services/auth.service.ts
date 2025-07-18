import { User } from '@/lib/db/schema';
import {dbPostgres} from '@/lib/db';
import { eq } from 'drizzle-orm';
import { userTable } from '@/lib/db/schema';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import bcrypt from 'bcrypt';

// JWT Secret should be in environment variables
if (!process.env.ACCESS_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET environment variable is required');
}
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const JWT_REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

if (!JWT_REFRESH_SECRET) {
    throw new Error('REFRESH_TOKEN_SECRET environment variable is required');
}

// Token expiration times
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // 7 days

if (!ACCESS_TOKEN_EXPIRY || !REFRESH_TOKEN_EXPIRY) {
    throw new Error('ACCESS_TOKEN_EXPIRY and REFRESH_TOKEN_EXPIRY environment variables are required');
}

// Interface for token payloads
export interface TokenPayload {
    userId: number;
    email: string;
    name: string;
    isAdmin?: boolean;
}

// Interface for auth tokens
export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

// Generate hash for password
export async function hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
}

// Verify password against hash
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT tokens
export function generateTokens(user: User): AuthTokens {
    const payload: TokenPayload = {
        userId: user.id as number,
        email: user.email as string,
        name: user.name,
        isAdmin: user.isAdmin
    };

    const accessToken = jwt.sign(payload, JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']
    });
    const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn']
    });

    return { accessToken, refreshToken };
}

// Verify JWT access token
export function verifyAccessToken(token: string): TokenPayload | null {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
        return decoded;
    } catch (error) {
        console.error('Error verifying access token:', error);
        return null;
    }
}

// Verify JWT refresh token
export function verifyRefreshToken(token: string): TokenPayload | null {
    try {
        console.log('Verifying refresh token with secret:', JWT_REFRESH_SECRET);
        const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
        console.log('Successfully decoded token:', decoded);
        return decoded;
    } catch (error) {
        console.error('Error verifying refresh token:', error);
        return null;
    }
}


// Set auth cookies
// export async function setAuthCookies(tokens: AuthTokens, response: ) {
//     const cookieStore = await cookies();

//     // Set refresh token in HTTP-only cookie for security
//     cookieStore.set('refreshToken', tokens.refreshToken, {
//         httpOnly: true,
//         secure: false,
//         sameSite: 'strict',
//         maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
//         path: '/'
//     });

//     // Just for fallback/compatibility, not the main storage method
//     cookieStore.set('accessToken', tokens.accessToken, {
//         httpOnly: true,
//         secure: false,
//         sameSite: 'strict',
//         maxAge: 60 * 60, // 15 minutes in seconds
//         path: '/'
//     });
// }
export function setAuthCookies(tokens: AuthTokens) {
    const response = new NextResponse(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });

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
}


// Clear auth cookies
export async function clearAuthCookies() {
    const cookieStore = await cookies();
    cookieStore.delete('refreshToken');
    cookieStore.delete('accessToken');
}

// Get user by email
export async function getUserByEmail(email: string): Promise<User | null> {
    const users = await dbPostgres.select().from(userTable).where(eq(userTable.email, email)).limit(1);
    return users.length > 0 ? users[0] : null;
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
    const users = await dbPostgres.select().from(userTable).where(eq(userTable.id, id)).limit(1);
    return users.length > 0 ? users[0] : null;
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<string | null> {
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) return null;

    const user = await getUserById(payload.userId);
    if (!user) return null;

    const { accessToken } = generateTokens(user);
    return accessToken;
}