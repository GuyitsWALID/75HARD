import { v } from "convex/values";

export const checksValidator = v.object({
  diet: v.boolean(),
  workouts: v.boolean(),
  water: v.boolean(),
  reading: v.boolean(),
  photo: v.boolean(),
});

export const blankChecks = () => ({
  diet: false,
  workouts: false,
  water: false,
  reading: false,
  photo: false,
});
