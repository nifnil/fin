import { db } from '@/db';
import { usersTable, adminTokensTable } from '@/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import argon2 from 'argon2';

export async function validateToken(token: string): Promise<boolean> {
  const adminTokens = await db
    .select()
    .from(adminTokensTable)
    .where(eq(adminTokensTable.token, token))
    .limit(1);

  const adminToken = adminTokens[0];
  if (!adminToken || adminToken.expiresAt < new Date() || adminToken.revoked) {
    return false;
  }

  return true;
}

export async function getUser(userId: string): Promise<typeof usersTable.$inferSelect | undefined> {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  return users[0];
}

export async function credentialCheck(userId: string, password: string): Promise<boolean> {
  const users = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  const user = users[0];
  if (!user) {
    return false;
  }

  const passwordValid = await argon2.verify(user.passwordHash, password);
  if (!passwordValid) {
    return false;
  }

  return true;
}

export async function createToken(userId: string): Promise<string> {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);
  const token = crypto.randomBytes(32).toString('hex');

  await db.insert(adminTokensTable).values({
    token,
    userId,
    expiresAt,
    revoked: false
  });

  return token;
}