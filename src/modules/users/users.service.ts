import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument } from "./schemas/user.schema";
import { EmailService } from "../email/email.service";

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private readonly _userModel: Model<UserDocument>,
    private readonly emailService: EmailService,
  ) { }

  get userModel() {
    return this._userModel;
  }

  async create(userData: any): Promise<UserDocument> {
    const newUser = new this.userModel(userData);
    const savedUser = await newUser.save();

    // Send email to newly created users automatically, except mock setup
    if (userData.password && userData.email && !userData.email.includes('akshaypatel@ariesxpert.com')) {
      try {
        const loginUrl = 'https://www.ariesxpert.com/login';
        await this.emailService.sendWelcomeEmail(savedUser.email, savedUser.firstName || 'User', userData.password, loginUrl);
      } catch (error) {
        console.error(`Failed to send setup email to new user ${savedUser.email}`);
      }
    }

    return savedUser;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).select("+password").exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdWithVerificationToken(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+verification_token').exec();
  }

  async findByPhone(phone: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async findByClinic(clinicId: string): Promise<UserDocument[]> {
    return this.userModel.find({ clinicId }).exec();
  }

  async updateFCM(userId: string, token: string) {
    return this.userModel.findByIdAndUpdate(
      userId,
      { fcmToken: token },
      { new: true },
    );
  }

  async updateLastLogin(userId: string) {
    return this.userModel.findByIdAndUpdate(userId, { lastLogin: new Date() });
  }

  async updateManyByClinic(clinicId: string, updateData: any) {
    return this.userModel.updateMany({ clinicId }, { $set: updateData }).exec();
  }
}
