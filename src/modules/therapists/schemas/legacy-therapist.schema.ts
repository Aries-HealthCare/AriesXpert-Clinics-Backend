import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LegacyTherapistDocument = LegacyTherapist & Document;

@Schema({ collection: "therapists", strict: false })
export class LegacyTherapist {
  @Prop()
  firstName: string;

  @Prop()
  lastName: string;

  @Prop()
  name: string;

  @Prop()
  email: string;

  @Prop()
  phone: string;

  @Prop()
  specialization: string;

  @Prop()
  rating: number;

  @Prop()
  profileImage: string;
}

export const LegacyTherapistSchema =
  SchemaFactory.createForClass(LegacyTherapist);
