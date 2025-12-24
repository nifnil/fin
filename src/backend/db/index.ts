if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

// bun 仅用于本地调试，vercel 上使用 neon serverless
export let db:
  | ReturnType<typeof import('drizzle-orm/bun-sql').drizzle>
  | ReturnType<typeof import('drizzle-orm/neon-serverless').drizzle>;

if (process.env.VERCEL) {
  const { drizzle } = await import('drizzle-orm/neon-serverless');
  db = drizzle(process.env.DATABASE_URL);
} else {
  const { drizzle } = await import('drizzle-orm/bun-sql');
  db = drizzle(process.env.DATABASE_URL);
}