import { Schema } from "mongoose";

// Flexible schema to read existing experts collection without enforcing shape
// Collection name is explicitly set to "experts"
export const ExpertSchema = new Schema(
  {},
  {
    collection: "experts",
    strict: false,
    timestamps: false,
  },
);
