import { ConvexError, v } from "convex/values";
import type { MutationCtx, QueryCtx } from "convex/server";
import { mutation, query } from "./_generated/server";
import { blankChecks, checksValidator } from "./validators";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError("Not authenticated");
  }
  return identity.subject;
}

function requireValidDate(startDate: string) {
  if (!DATE_PATTERN.test(startDate)) {
    throw new ConvexError("Invalid start date");
  }
}

function requireValidDay(day: number) {
  if (!Number.isInteger(day) || day < 1 || day > 75) {
    throw new ConvexError("Invalid day");
  }
}

async function findTracker(ctx: QueryCtx | MutationCtx, userId: string) {
  return await ctx.db
    .query("trackers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
}

async function findEntry(ctx: QueryCtx | MutationCtx, userId: string, day: number) {
  return await ctx.db
    .query("entries")
    .withIndex("by_user_day", (q) => q.eq("userId", userId).eq("day", day))
    .unique();
}

async function ensureTracker(ctx: MutationCtx, userId: string, startDate: string) {
  const tracker = await findTracker(ctx, userId);
  if (!tracker) {
    await ctx.db.insert("trackers", { userId, startDate });
    return;
  }
  if (tracker.startDate !== startDate) {
    await ctx.db.patch(tracker._id, { startDate });
  }
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const tracker = await findTracker(ctx, userId);
    const docs = await ctx.db
      .query("entries")
      .withIndex("by_user_day", (q) => q.eq("userId", userId))
      .collect();

    const entries = [];
    for (const doc of docs.sort((a, b) => a.day - b.day)) {
      entries.push({
        day: doc.day,
        checks: doc.checks,
        note: doc.note,
        hasPhoto: doc.photoId !== undefined,
        photoUrl: doc.photoId ? await ctx.storage.getUrl(doc.photoId) : null,
      });
    }

    return {
      startDate: tracker?.startDate ?? null,
      entries,
    };
  },
});

export const setStartDate = mutation({
  args: { startDate: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    requireValidDate(args.startDate);
    await ensureTracker(ctx, userId, args.startDate);
  },
});

export const updateEntry = mutation({
  args: {
    startDate: v.string(),
    day: v.number(),
    checks: v.optional(checksValidator),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    requireValidDate(args.startDate);
    requireValidDay(args.day);
    if (args.note !== undefined && args.note.length > 2000) {
      throw new ConvexError("Note is too long");
    }
    await ensureTracker(ctx, userId, args.startDate);

    const existing = await findEntry(ctx, userId, args.day);
    if (existing) {
      const checks = args.checks
        ? { ...args.checks, photo: Boolean(existing.photoId) }
        : undefined;
      await ctx.db.patch(existing._id, {
        ...(checks ? { checks } : {}),
        ...(args.note !== undefined ? { note: args.note } : {}),
      });
      return;
    }

    await ctx.db.insert("entries", {
      userId,
      day: args.day,
      checks: { ...(args.checks ?? blankChecks()), photo: false },
      note: args.note ?? "",
    });
  },
});

export const generatePhotoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireUserId(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const setPhoto = mutation({
  args: {
    startDate: v.string(),
    day: v.number(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    requireValidDate(args.startDate);
    requireValidDay(args.day);
    await ensureTracker(ctx, userId, args.startDate);

    const existing = await findEntry(ctx, userId, args.day);
    if (existing?.photoId && existing.photoId !== args.storageId) {
      await ctx.storage.delete(existing.photoId);
    }

    const checks = { ...(existing?.checks ?? blankChecks()), photo: true };
    if (existing) {
      await ctx.db.patch(existing._id, { photoId: args.storageId, checks });
      return;
    }

    await ctx.db.insert("entries", {
      userId,
      day: args.day,
      checks,
      note: "",
      photoId: args.storageId,
    });
  },
});

export const removePhoto = mutation({
  args: {
    startDate: v.string(),
    day: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    requireValidDate(args.startDate);
    requireValidDay(args.day);

    const existing = await findEntry(ctx, userId, args.day);
    if (!existing?.photoId) {
      return;
    }

    await ctx.storage.delete(existing.photoId);
    await ctx.db.patch(existing._id, {
      photoId: undefined,
      checks: { ...existing.checks, photo: false },
    });
  },
});

export const reset = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);

    const entries = await ctx.db
      .query("entries")
      .withIndex("by_user_day", (q) => q.eq("userId", userId))
      .collect();

    for (const entry of entries) {
      if (entry.photoId) {
        await ctx.storage.delete(entry.photoId);
      }
      await ctx.db.delete(entry._id);
    }

    const tracker = await findTracker(ctx, userId);
    if (tracker) {
      await ctx.db.delete(tracker._id);
    }
  },
});
