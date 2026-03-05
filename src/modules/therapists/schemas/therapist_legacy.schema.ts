import { Schema } from "mongoose";

// Read legacy plural collection name "therapists"
export const TherapistLegacySchema = new Schema(
  {},
  {
    collection: "therapists",
    strict: false,
    timestamps: false,
  },
);
