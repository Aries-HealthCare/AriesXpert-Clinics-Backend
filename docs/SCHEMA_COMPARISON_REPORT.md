# Schema Comparison Report: OLD vs NEW Project

## Executive Summary
This report analyzes the schema differences between the OLD (Legacy) Project and the NEW Project. The goal is to identify gaps and mismatches to ensure the NEW project can seamlessly display data imported from the OLD project.

## 1. Collection Mapping

| Entity | OLD Collection (Inferred) | NEW Collection (Default) | Action Required |
| :--- | :--- | :--- | :--- |
| **Appointment** | `appointments` | `visits` (via `Visit` schema) | **CRITICAL**: Map `Visit` schema to `appointments` collection. |
| **Therapist** | `users` (User w/ role) | `therapists` | **CRITICAL**: Map `Therapist` schema to `users` collection. |
| **User** | `users` | `users` | No action. |
| **Patient** | `patients` | `patients` | Add missing fields. |
| **Treatment** | `treatments` | `treatments` | Verify fields. |
| **Package** | `packages` | `packages` | Matches. |

## 2. Detailed Schema Analysis

### A. Appointment vs Visit
**OLD Model:** `Appointment`
**NEW Model:** `Visit` (in `appointments` module)

| Field | OLD | NEW | Status | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Collection** | `appointments` | `visits` | **MISMATCH** | Change `@Schema` to `appointments`. |
| **Date** | `appointmentDate` | `visitDate` / `startTime` | **MISMATCH** | Add `appointmentDate` field. Add virtual `startTime` -> `appointmentDate`. |
| **Time** | `appointmentTime` | `startTime` (Date) | **MISMATCH** | Parse/Merge into `startTime`. |
| **Patient** | `patient` (Ref) | `patientId` (Ref) | **MISMATCH** | Add `patient` field. Alias `patientId` -> `patient._id`. |
| **Therapist** | Implicit (User/Expert?) | `therapistId` | **MISSING** | Add `expert` field (from Treatment?). Alias `therapistId`. |
| **Status** | `appointmentStatus` | `status` | **MISMATCH** | Map values. Alias `status` -> `appointmentStatus`. |
| **Type** | `visitType` | `visitType` | Match | None. |
| **Treatment** | `treatment` (Ref) | Missing | **MISSING** | Add `treatment` field. |

### B. User vs Therapist
**OLD Model:** `User` (contains auth + profile)
**NEW Model:** `Therapist` (profile only, links to User)

| Field | OLD | NEW | Status | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Collection** | `users` | `therapists` | **MISMATCH** | Change `@Schema` to `users`. |
| **Link** | N/A (Self) | `userId` (Ref) | **MISMATCH** | Make `userId` optional. Add virtual `userId` returning `this`. |
| **Profile** | `professionalInfo` | `professionalInfo` | Match | Ensure structure matches. |
| **Bank** | `bankInfo` | `bankDetails` | **MISMATCH** | Rename/Alias `bankDetails` -> `bankInfo`. |
| **Service** | `areaOfServiceInfo` | `areaOfServiceInfo` | Match | None. |

### C. Patient
**OLD Model:** `Patient`
**NEW Model:** `Patient`

| Field | OLD | NEW | Status | Fix |
| :--- | :--- | :--- | :--- | :--- |
| **Religion** | `religion` | Missing | **MISSING** | Add `religion` field. |
| **Address** | Object | String | **MISMATCH** | Change `address` to Mixed/Object type to support both. |
| **Last Visit**| `lastVisit` | Missing | **MISSING** | Add `lastVisit` field. |
| **Conditions**| `medicalConditions` (List) | `condition` (String) | **MISMATCH** | Add `medicalConditions`. Sync with `condition`. |

## 3. Implementation Plan

1.  **Modify `Visit` Schema**: Point to `appointments`, add OLD fields, add virtuals for NEW fields.
2.  **Modify `Therapist` Schema**: Point to `users`, handle `userId` via virtual, map fields.
3.  **Modify `Patient` Schema**: Add missing fields, fix address type.
4.  **Verify `Treatment` Schema**: Ensure connection to `appointments` works.

This plan ensures data visibility without altering the UI or existing NEW logic significantly.
