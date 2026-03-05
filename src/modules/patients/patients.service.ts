import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Patient, PatientDocument, PatientSchema } from "./schemas/patient.schema";
import { TenantConnectionService } from "../../common/multitenancy/tenant-connection.service";

@Injectable()
export class PatientsService {
  constructor(
    @InjectModel(Patient.name) private patientModel: Model<PatientDocument>,
  ) { }

  /**
   * Transform MongoDB patient to UI schema
   */
  private transformPatient(patient: any) {
    if (!patient) return null;

    const patientObj = patient.toObject ? patient.toObject() : patient;
    const dob = patientObj.dob || patientObj.profile?.personalDetails?.dob;

    // Address Normalization
    let addr = patientObj.address || {};
    if (typeof addr === "string") {
      try {
        // Try parsing if it looks like JSON
        if (addr.trim().startsWith("{")) addr = JSON.parse(addr);
        else addr = { addressLine1: addr };
      } catch (e) {
        addr = { addressLine1: addr };
      }
    }

    // City Extraction
    let city = patientObj.city || addr.city || addr.City || "";
    if (!city || city === "Unknown") {
      // Heuristic fallbacks
      if (addr.cityId === "6738253588db69145726a362") city = "Lucknow";
      else if (
        addr.addressLine2 &&
        addr.addressLine2.toLowerCase().includes("mumbai")
      )
        city = "Mumbai";
      else if (
        addr.addressLine2 &&
        addr.addressLine2.toLowerCase().includes("lucknow")
      )
        city = "Lucknow";
      else if (
        addr.addressLine2 &&
        addr.addressLine2.toLowerCase().includes("thane")
      )
        city = "Thane";
    }

    // Area Extraction
    let area = patientObj.area || addr.area || "";
    if (!area && addr.addressLine2) {
      if (addr.addressLine2.length < 30) {
        area = addr.addressLine2;
      } else {
        const parts = addr.addressLine2.split(",");
        if (parts.length > 0) area = parts[parts.length - 1].trim();
      }
    }

    return {
      id: patientObj._id ? patientObj._id.toString() : "",
      firstName: patientObj.firstName || "",
      lastName: patientObj.lastName || "",
      name:
        `${patientObj.firstName || ""} ${patientObj.lastName || ""}`.trim() ||
        "Unknown",
      phone: patientObj.phone || "",
      email: patientObj.email || "",
      city: city || "Unknown",
      area: area || "Unknown", // New Field
      address: addr, // Pass full address object to frontend
      age: patientObj.age || null,
      gender: patientObj.gender || "Other",
      status: patientObj.status || "Pending",
      condition:
        patientObj.condition ||
        (Array.isArray(patientObj.medicalConditions)
          ? patientObj.medicalConditions.join(", ")
          : "") ||
        "",
      createdAt: patientObj.createdAt
        ? new Date(patientObj.createdAt).getTime()
        : Date.now(),

      // Nested profile (matches UI expectations)
      profile: {
        personalDetails: {
          age: patientObj.age || null,
          gender: patientObj.gender || "Other",
          dob: dob ? new Date(dob).toISOString() : "",
        },
        contact: {
          phone: patientObj.phone || "",
          email: patientObj.email || "",
        },
        address: {
          line1:
            typeof addr === "string"
              ? addr
              : addr.addressLine1 || addr.street || "",
          city: city,
          area: area,
          pincode: patientObj.pincode || addr.pincode || addr.pinCode || "",
          country: "India",
          fullAddress: this.buildFullAddress(patientObj),
        },
        medicalInfo: {
          condition:
            patientObj.condition ||
            (Array.isArray(patientObj.medicalConditions)
              ? patientObj.medicalConditions.join(", ")
              : "") ||
            "",
          medicalHistory: patientObj.medicalHistory
            ? [patientObj.medicalHistory]
            : [],
          bloodGroup: patientObj.bloodGroup || "",
          allergies: patientObj.allergies || [],
          currentMedications: patientObj.currentMedications || [],
        },
        consent: {
          consentGiven: patientObj.consentGiven || false,
        },
        assignedTherapist: {
          therapistId: patientObj.assignedTherapist
            ? patientObj.assignedTherapist.toString()
            : "",
          name:
            patientObj.assignedTherapist?.firstName &&
              patientObj.assignedTherapist?.lastName
              ? `${patientObj.assignedTherapist.firstName} ${patientObj.assignedTherapist.lastName}`
              : "",
        },
        emergency: {
          contactName: patientObj.emergencyContact?.contactName || "",
          relationship: patientObj.emergencyContact?.relationship || "",
          phone: patientObj.emergencyContact?.contactNumber || "",
        },
      },
    };
  }

  /**
   * Build full address string
   */
  private buildFullAddress(patient: any): string {
    const addr = patient.address;
    let addressStr = "";

    if (typeof addr === "string") {
      addressStr = addr;
    } else if (typeof addr === "object" && addr !== null) {
      // Concatenate known fields
      addressStr = [
        addr.line1,
        addr.street,
        addr.addressLine1,
        addr.addressLine2,
        addr.landmark,
        addr.city,
        addr.state,
        addr.zipCode || addr.pinCode || addr.pincode,
      ]
        .filter(Boolean)
        .join(", ");
    }

    const parts = [
      addressStr,
      patient.city,
      patient.pincode && `- ${patient.pincode}`,
      patient.country || "India",
    ].filter(Boolean);

    // Remove duplicates if addressStr already contains city/pincode
    return Array.from(new Set(parts)).join(", ");
  }

  /**
   * Create new patient
   */
  async create(createPatientDto: any) {
    const patient = await this.patientModel.create(createPatientDto);
    return this.transformPatient(patient);
  }

  /**
   * Get all patients with pagination and filtering
   */
  async findAll(query: any, userClinicId?: string) {
    const filter: any = {
      $or: [{ isDeleted: false }, { isDeleted: { $exists: false } }],
    };

    // Apply mandatory clinic isolation
    const effectiveClinicId = userClinicId || query.clinicId;
    if (effectiveClinicId) filter["clinicId"] = effectiveClinicId;

    // Restore other filters
    if (query.status) filter["status"] = query.status;
    if (query.city) filter["city"] = query.city;
    if (query.condition) filter["condition"] = query.condition;
    if (query.gender) filter["gender"] = query.gender;

    // Add pagination
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [patients, total] = await Promise.all([
      this.patientModel
        .find(filter)
        .populate("assignedTherapist", "firstName lastName specialization")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.patientModel.countDocuments(filter),
    ]);

    return {
      data: patients.map((p) => this.transformPatient(p)),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single patient by ID
   */
  async findOne(id: string) {
    const patient = await this.patientModel
      .findById(id)
      .populate("assignedTherapist", "firstName lastName specialization")
      .lean()
      .exec();

    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }

    return this.transformPatient(patient);
  }

  /**
   * Update patient
   */
  async update(id: string, updatePatientDto: any) {
    const patient = await this.patientModel
      .findByIdAndUpdate(id, updatePatientDto, { new: true })
      .populate("assignedTherapist", "firstName lastName specialization")
      .lean()
      .exec();

    if (!patient) {
      throw new NotFoundException(`Patient #${id} not found`);
    }

    return this.transformPatient(patient);
  }

  /**
   * Get patients by status
   */
  async findByStatus(status: string) {
    const patients = await this.patientModel
      .find({ status, isDeleted: false })
      .populate("assignedTherapist", "firstName lastName")
      .lean()
      .exec();

    return patients.map((p) => this.transformPatient(p));
  }

  /**
   * Get patients by city
   */
  async findByCity(city: string) {
    const patients = await this.patientModel
      .find({ city, isDeleted: false })
      .populate("assignedTherapist", "firstName lastName")
      .lean()
      .exec();

    return patients.map((p) => this.transformPatient(p));
  }
}
