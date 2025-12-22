import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const articlesTable = pgTable(
  'articles',
  {
    id: uuid().primaryKey().defaultRandom(),
    slug: text().notNull().unique(),
    title: text().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at'),
    seriesId: uuid('series_id').references(() => seriesTable.id, {
      onDelete: 'set null',
    }),
    seriesOrder: integer('series_order'),
    isPublished: boolean('is_published').notNull().default(false),
  },
  (table) => [
    index('idx_articles_series').on(table.seriesId, table.seriesOrder),
  ]
);

export const articleVersionsTable = pgTable(
  'article_versions',
  {
    id: uuid().primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articlesTable.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),
    contentMarkdown: text('content_markdown'),
    aiSummary: text('ai_summary'),
    aiPostNote: text('ai_post_note'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    isPublished: boolean('is_published').notNull().default(false),
  },
  (table) => [index('idx_article_versions_article').on(table.articleId)]
);

export const articlesRelations = relations(articlesTable, ({ one, many }) => ({
  versions: many(articleVersionsTable),
  series: one(seriesTable, {
    fields: [articlesTable.seriesId],
    references: [seriesTable.id],
  }),
  topics: many(articleTopicsTable),
}));

export const articleVersionsRelations = relations(
  articleVersionsTable,
  ({ one, many }) => ({
    article: one(articlesTable, {
      fields: [articleVersionsTable.articleId],
      references: [articlesTable.id],
    }),
    assets: many(articleAssetsTable),
  })
);

export const seriesTable = pgTable('series', {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull().unique(),
  description: text(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const seriesRelations = relations(seriesTable, ({ many }) => ({
  articles: many(articlesTable),
}));

export const topicsTable = pgTable('topics', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  description: text(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const topicsRelations = relations(topicsTable, ({ many }) => ({
  articles: many(articleTopicsTable),
}));

export const articleTopicsTable = pgTable(
  'article_topics',
  {
    articleId: uuid('article_id')
      .notNull()
      .references(() => articlesTable.id, { onDelete: 'cascade' }),
    topicId: uuid('topic_id')
      .notNull()
      .references(() => topicsTable.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.articleId, table.topicId] })]
);

export const articleTopicsRelations = relations(
  articleTopicsTable,
  ({ one }) => ({
    article: one(articlesTable, {
      fields: [articleTopicsTable.articleId],
      references: [articlesTable.id],
    }),
    topic: one(topicsTable, {
      fields: [articleTopicsTable.topicId],
      references: [topicsTable.id],
    }),
  })
);

export const usersTable = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  username: text().notNull().unique(),
  email: text().notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at'),
});

export const usersRelations = relations(usersTable, ({ many }) => ({
  tokens: many(adminTokensTable),
}));

export const adminTokensTable = pgTable('admin_tokens', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  token: text().notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  lastActiveAt: timestamp('last_active_at'),
  revoked: boolean('revoked').notNull().default(false),
});

export const adminTokensRelations = relations(adminTokensTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [adminTokensTable.userId],
    references: [usersTable.id],
  }),
}));

export const assetsTable = pgTable('assets', {
  id: uuid().primaryKey().defaultRandom(),
  filename: text().notNull(),
  bucketKey: text('bucket_key').notNull(),
  mimeType: text('mime_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  referenceCount: integer('reference_count').notNull().default(0),
});

export const assetsRelations = relations(assetsTable, ({ many }) => ({
  articleVersions: many(articleAssetsTable),
}));

export const articleAssetsTable = pgTable(
  'article_assets',
  {
    articleVersionId: uuid('article_version_id')
      .notNull()
      .references(() => articleVersionsTable.id, { onDelete: 'cascade' }),
    assetId: uuid('asset_id')
      .notNull()
      .references(() => assetsTable.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.articleVersionId, table.assetId] })]
);

export const articleAssetsRelations = relations(
  articleAssetsTable,
  ({ one }) => ({
    articleVersion: one(articleVersionsTable, {
      fields: [articleAssetsTable.articleVersionId],
      references: [articleVersionsTable.id],
    }),
    asset: one(assetsTable, {
      fields: [articleAssetsTable.assetId],
      references: [assetsTable.id],
    }),
  })
);
