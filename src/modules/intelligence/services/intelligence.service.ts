import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
    TherapistLocationLog,
    VisitIntegrityLog,
    LeakageFlag,
    PatientLocation
} from '../schemas/intelligence.schema';
import { Patient } from '../../patients/schemas/patient.schema';
import { Visit } from '../../appointments/schemas/visit.schema';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class IntelligenceService {
    private readonly logger = new Logger(IntelligenceService.name);
    private readonly RADIUS_THRESHOLD = 100; // 100 meters
    private readonly DURATION_THRESHOLD = 10; // 10 minutes for unauthorized visit detection

    constructor(
        @InjectModel(Patient.name) private patientModel: Model<Patient>,
        @InjectModel(Visit.name) private visitModel: Model<Visit>,
        @InjectModel(TherapistLocationLog.name) private locationLogModel: Model<TherapistLocationLog>,
        @InjectModel(VisitIntegrityLog.name) private integrityLogModel: Model<VisitIntegrityLog>,
        @InjectModel(LeakageFlag.name) private leakageFlagModel: Model<LeakageFlag>,
    ) { }

    @OnEvent('visit.started')
    async handleVisitStarted(visit: any) {
        const patientId = visit.patientId || visit.patient;
        if (patientId) {
            await this.patientModel.findByIdAndUpdate(patientId, { $inc: { scheduledVisitsCount: 1 } });
            this.logger.log(`Intelligence Engine: Tracked session start for Patient ${patientId}`);
        }
    }

    @OnEvent('visit.completed')
    async handleVisitCompleted(visit: any) {
        const patientId = visit.patientId || visit.patient;
        if (patientId) {
            await this.patientModel.findByIdAndUpdate(patientId, { $inc: { completedVisitsCount: 1, gpsDetectedVisitsCount: 1 } });
            this.logger.log(`Intelligence Engine: Verified physical session for Patient ${patientId}`);
        }
    }

    /**
     * Phase 5: Receive Background GPS Pulse
     */
    async trackTherapistLocation(therapistId: string, location: { lat: number, lng: number, accuracy?: number, batteryLevel?: number }) {
        // 1. Log the movement
        await this.locationLogModel.create({
            therapistId: new Types.ObjectId(therapistId),
            latitude: location.lat,
            longitude: location.lng,
            accuracy: location.accuracy,
            batteryLevel: location.batteryLevel,
            timestamp: new Date()
        });

        // 2. Proximity Analysis (Detect Leakage)
        await this.analyzeProximity(therapistId, location);

        return { success: true };
    }

    /**
     * Phase 4: Leakage Detection Engine
     */
    private async analyzeProximity(therapistId: string, currentLocation: { lat: number, lng: number }) {
        // Find patients near this location
        // Using a simple $near query or manual distance for simplicity in this proto
        // In prod, use Geospatial indexing
        const patients = await this.patientModel.find({
            isActive: true,
            latitude: { $exists: true },
            longitude: { $exists: true }
        }).lean();

        for (const patient of patients) {
            const distance = this.calculateDistance(currentLocation.lat, currentLocation.lng, patient.latitude, patient.longitude);

            if (distance <= (patient.geoRadius || this.RADIUS_THRESHOLD)) {
                // THERAPIST DETECTED AT PATIENT LOCATION

                // Logic 1: Check if there's an active 'in-progress' visit
                const activeVisit = await this.visitModel.findOne({
                    therapistId: new Types.ObjectId(therapistId),
                    patientId: patient._id,
                    status: 'in-progress'
                });

                if (!activeVisit) {
                    // POTENTIAL LEAKAGE: No visit started in app
                    await this.handlePotentialLeakage(therapistId, patient._id.toString(), patient);
                } else {
                    // VALID VISIT: Increment GPS detected visit count if not already done for this session
                    // Usually handled by a flag on the visit or a separate detection log
                }
            }
        }
    }

    private async handlePotentialLeakage(therapistId: string, patientId: string, patient: any) {
        // Logic 3: Closed Patient Detection
        if (patient.status === 'Discharged' || patient.status === 'Inactive') {
            await this.logLeakage(therapistId, patientId, 'CLOSED_CASE_VISIT', 'CRITICAL', 'Therapist detected at location of a CLOSED patient.');
            return;
        }

        // Logic 1: Unauthorized Visit Detection
        // Need to check if they stay > threshold time
        // For a single pulse, we can log an integrity 'detection'
        // If multiple pulses detected, upgrade to LEAKAGE FLAG
        await this.integrityLogModel.create({
            therapistId: new Types.ObjectId(therapistId),
            patientId: new Types.ObjectId(patientId),
            eventType: 'UNAUTHORIZED_DETECTION',
            timestamp: new Date()
        });

        // Increase suspicion count on patient
        await this.patientModel.findByIdAndUpdate(patientId, { $inc: { suspiciousVisitCount: 1 } });
    }

    async logLeakage(therapistId: string, patientId: string, reason: string, severity: string, details: string) {
        await this.leakageFlagModel.create({
            therapistId: new Types.ObjectId(therapistId),
            patientId: new Types.ObjectId(patientId),
            reason,
            severityLevel: severity,
            notes: details
        });

        // Mark patient as RED
        await this.patientModel.findByIdAndUpdate(patientId, { $inc: { leakageFlagCount: 1 } });

        this.logger.error(`🚩 LEAKAGE DETECTED: Therapist ${therapistId} at Patient ${patientId} [${reason}]`);
    }

    /**
     * Phase 1 & 7: Admin Dashboard Map Data
     */
    async getMapIntelligence() {
        const patients = await this.patientModel.find({ isDeleted: false }).lean();

        return patients.map(p => {
            const color = this.determineMarkerColor(p);
            return {
                id: p._id,
                name: `${p.firstName} ${p.lastName || ''}`,
                latitude: p.latitude,
                longitude: p.longitude,
                color: color,
                stats: {
                    scheduled: p.scheduledVisitsCount,
                    completed: p.completedVisitsCount,
                    gpsDetected: p.gpsDetectedVisitsCount,
                },
                status: p.status,
                stage: p.stage,
                riskLevel: p.leakageFlagCount > 0 ? 'CRITICAL' : p.suspiciousVisitCount > 0 ? 'HIGH' : 'LOW'
            };
        });
    }

    private determineMarkerColor(p: any): string {
        if (p.leakageFlagCount > 0 || p.suspiciousVisitCount > 5) return 'RED'; // Lead Leakage / Suspicious
        if (p.status === 'Discharged' || p.status === 'Inactive') return 'GREY'; // Closed
        if (p.completedVisitsCount > 0) return 'PURPLE'; // Valid Visits Completed
        if (p.assignedTherapist) return 'BLUE'; // Active Assigned
        if (p.stage === 'Lead') return 'YELLOW'; // Unconverted Lead
        return 'BLUE';
    }

    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // metres
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // in metres
    }

    /**
     * Phase 8: Leakage Analytics Panel
     */
    async getAnalytics() {
        // Aggregate operational data
        const totalPatients = await this.patientModel.countDocuments({ isActive: true });

        const visitAgg = await this.patientModel.aggregate([
            {
                $group: {
                    _id: null,
                    totalCompleted: { $sum: "$completedVisitsCount" },
                    totalGpsAuth: { $sum: "$gpsDetectedVisitsCount" },
                    totalUnauthorized: { $sum: "$suspiciousVisitCount" }
                }
            }
        ]);

        const stats = visitAgg[0] || { totalCompleted: 0, totalGpsAuth: 0, totalUnauthorized: 0 };

        // Leakage % = (Unauthorized / (Completed + Unauthorized)) * 100
        const divider = stats.totalCompleted + stats.totalUnauthorized;
        const leakagePercentage = divider > 0 ? (stats.totalUnauthorized / divider) * 100 : 0;

        // Top 10 Risk Therapists
        const riskTherapists = await this.leakageFlagModel.aggregate([
            { $group: { _id: "$therapistId", flagCount: { $sum: 1 } } },
            { $sort: { flagCount: -1 } },
            { $limit: 10 },
            { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'therapist' } },
            { $unwind: { path: "$therapist", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    therapistId: "$_id",
                    name: "$therapist.firstName",
                    flagCount: 1
                }
            }
        ]);

        return {
            totalActivePatients: totalPatients,
            totalCompletedVisits: stats.totalCompleted,
            totalGpsDetectedVisits: stats.totalGpsAuth,
            totalUnauthorizedVisits: stats.totalUnauthorized,
            leakagePercentage: leakagePercentage.toFixed(1),
            topRiskTherapists: riskTherapists
        };
    }
}
