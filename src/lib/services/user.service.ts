import { eq } from "drizzle-orm";
import { dbPostgres } from "../db";
import { User, userTable } from "../db/schema";

export async function findUsers(): Promise<User[]> {
    return await dbPostgres
        .select()
        .from(userTable);
}

export async function findUserById(id: number): Promise<User | null> {
    return (await dbPostgres
        .select()
        .from(userTable)
        .where(eq(userTable.id, id)))[0];
}

export async function createUser(newUser: User): Promise<User | null> {
    const {createdAt, updatedAt, id, ...rest} = newUser;
    const [existingUser] = await dbPostgres
        .select()
        .from(userTable)
        .where(eq(userTable.email, rest.email));

    if (existingUser) return null;

    return (
        await dbPostgres
        .insert(userTable)
        .values(rest)
        .returning()
    )[0];
}

export async function updateUser(id: number, updates: Partial<User>): Promise<User | null> {
    const {createdAt, updatedAt, ...rest} = updates;
    const [updated] = await dbPostgres
        .update(userTable)
        .set(rest)
        .where(eq(userTable.id, id))
        .returning();
    return updated || null;
}

export async function findUserByEmail(email: string) {
    const result = await dbPostgres.select().from(userTable).where(eq(userTable.email, email));
    return result[0];
}

export async function findUserByPhone(whatsapp: string) {
    const result = await dbPostgres.select().from(userTable).where(eq(userTable.phone, whatsapp));
    return result[0];
}