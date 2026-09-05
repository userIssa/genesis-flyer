import mongoose, { Schema, models, model } from "mongoose";

export interface Celebrant {
  _id?: string;
  name: string;
  position: string;
  unit: string; // branch / department, e.g. "QSR, Asaba"
  birthDay: number; // 1-31, drives sort order and the "1st/2nd/3rd" badge
  photoUrl?: string | null; // set once a photo is uploaded/matched
  photoMatchedBy?: "auto" | "manual" | null;
}

export interface FlyerSessionDoc extends mongoose.Document {
  title: string; // e.g. "March Birthday Celebrants"
  monthTag: string; // e.g. "#MarchBirthdayCelebrants2026"
  message: string; // the greeting copy under "Happy Birthday"
  celebrants: mongoose.Types.DocumentArray<Celebrant>;
  createdAt: Date;
  updatedAt: Date;
}

const CelebrantSchema = new Schema<Celebrant>(
  {
    name: { type: String, required: true },
    position: { type: String, default: "" },
    unit: { type: String, default: "" },
    birthDay: { type: Number, required: true, min: 1, max: 31 },
    photoUrl: { type: String, default: null },
    photoMatchedBy: { type: String, enum: ["auto", "manual", null], default: null },
  },
  { _id: true }
);

const FlyerSessionSchema = new Schema<FlyerSessionDoc>(
  {
    title: { type: String, required: true },
    monthTag: { type: String, default: "" },
    message: { type: String, default: "" },
    celebrants: { type: [CelebrantSchema], default: [] },
  },
  { timestamps: true }
);

export const FlyerSession =
  (models.FlyerSession as mongoose.Model<FlyerSessionDoc>) ||
  model<FlyerSessionDoc>("FlyerSession", FlyerSessionSchema);
