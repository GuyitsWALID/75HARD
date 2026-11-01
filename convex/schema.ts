import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { checksValidator } from "./validators";

export default defineSchema({
  trackers: defineTable({
    userId: v.string(),
    startDate: v.string(),
  }).index("by_user", ["userId"]),
  entries: defineTable({
    userId: v.string(),
    day: v.number(),
    checks: checksValidator,
    note: v.string(),
    photoId: v.optional(v.id("_storage")),
  }).index("by_user_day", ["userId", "day"]),
});
