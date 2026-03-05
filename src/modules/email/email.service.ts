import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as nodemailer from 'nodemailer';
import { EmailSetting, EmailSettingDocument } from './schemas/email-setting.schema';
import { EmailLog, EmailLogDocument } from './schemas/email-log.schema';
import { UpdateEmailSettingsDto } from './dto/update-email-settings.dto';
import { ConfigService } from '@nestjs/config';
// Use named exports from crypto-js to avoid CommonJS/ESM interop issues
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EmailService implements OnModuleInit {
    private transporter: nodemailer.Transporter | null = null;
    private readonly logger = new Logger(EmailService.name);
    private encryptionKey: string;

    constructor(
        @InjectModel(EmailSetting.name) private emailSettingModel: Model<EmailSettingDocument>,
        @InjectModel(EmailLog.name) private emailLogModel: Model<EmailLogDocument>,
        private configService: ConfigService,
    ) {
        this.encryptionKey = this.configService.get<string>('JWT_SECRET') || 'ariesxpert-fallback-secure-key-2024';
    }

    // ─── Bootstrap: Load transporter on app start ────────────────────────────
    async onModuleInit() {
        this.logger.log('EmailService initializing — loading SMTP transporter from DB...');
        await this.reloadTransporter();
    }

    // ─── AES Encryption helpers ───────────────────────────────────────────────
    private encrypt(text: string): string {
        return CryptoJS.AES.encrypt(text, this.encryptionKey).toString();
    }

    private decrypt(ciphertext: string): string {
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, this.encryptionKey);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (!decrypted) throw new Error('Decrypted value is empty');
            return decrypted;
        } catch (err) {
            this.logger.error(`AES decryption error: ${err.message}. Possible key mismatch. Re-save SMTP settings.`);
            return '';
        }
    }

    // ─── Get Settings (masked) ────────────────────────────────────────────────
    async getSettings(): Promise<any> {
        const settings = await this.emailSettingModel.findOne().exec();
        if (!settings) return null;

        return {
            host: settings.host,
            port: settings.port,
            username: settings.username,
            password: '••••••••',   // Always masked on GET
            tls: settings.tls,
            ssl: settings.ssl,
            from_name: settings.from_name,
            from_email: settings.from_email,
            reply_to: settings.reply_to,
        };
    }

    // ─── Update / Create Settings ────────────────────────────────────────────
    async updateSettings(dto: UpdateEmailSettingsDto, updatedBy: string = 'system') {
        let settings = await this.emailSettingModel.findOne().exec();

        const isMaskedOrEmpty =
            !dto.password ||
            dto.password.trim() === '' ||
            dto.password === '••••••••' ||
            dto.password === '--------';

        if (settings) {
            // Update existing
            settings.host = dto.host;
            settings.port = dto.port;
            settings.username = dto.username;
            settings.tls = dto.tls ?? false;
            settings.ssl = dto.ssl ?? false;
            settings.from_name = dto.from_name;
            settings.from_email = dto.from_email;
            settings.reply_to = dto.reply_to;
            settings.updated_by = updatedBy;

            if (!isMaskedOrEmpty) {
                this.logger.log(`Updating encrypted SMTP password for ${dto.username}`);
                settings.password_encrypted = this.encrypt(dto.password);
            } else {
                this.logger.log('Password unchanged — keeping existing encrypted password.');
            }

            await settings.save();
        } else {
            // First-time creation
            if (isMaskedOrEmpty) {
                throw new Error('Password is required for first-time SMTP configuration.');
            }

            settings = new this.emailSettingModel({
                host: dto.host,
                port: dto.port,
                username: dto.username,
                password_encrypted: this.encrypt(dto.password),
                tls: dto.tls ?? false,
                ssl: dto.ssl ?? false,
                from_name: dto.from_name,
                from_email: dto.from_email,
                reply_to: dto.reply_to,
                updated_by: updatedBy,
            });

            await settings.save();
        }

        // Reload transporter immediately after saving
        await this.reloadTransporter();
        return this.getSettings();
    }

    // ─── (Re)Build Nodemailer Transporter from DB ────────────────────────────
    async reloadTransporter() {
        const config = await this.emailSettingModel.findOne().exec();
        if (!config) {
            this.transporter = null;
            this.logger.warn('No SMTP config found in DB. Email sending is disabled.');
            return;
        }

        const password = this.decrypt(config.password_encrypted);
        if (!password) {
            this.transporter = null;
            this.logger.error(
                `SMTP password decryption returned empty for ${config.username}. ` +
                `Re-save SMTP settings from the Admin Dashboard.`
            );
            return;
        }

        // Respect the user's explicit SSL/TLS settings from the dashboard.
        // Port 465 → implicit SSL (secure: true)
        // Port 587 → STARTTLS (secure: false + requireTLS)
        // Fallback: use the ssl toggle from DB config
        const useImplicitSSL = config.ssl || config.port === 465;

        const transportOptions: nodemailer.TransportOptions = {
            host: config.host,
            port: config.port,
            secure: useImplicitSSL,
            auth: {
                user: config.username,
                pass: password,
            },
            tls: {
                rejectUnauthorized: false,  // Accept self-signed certs (shared hosting)
                minVersion: 'TLSv1.2',
            },
            // Cloud-friendly timeouts (Render/Railway have slow DNS)
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 45000,
            pool: false,
            debug: process.env.NODE_ENV !== 'production',
        } as any;

        // STARTTLS: require TLS upgrade when the user enabled TLS or when using port 587
        if (!useImplicitSSL && (config.tls || config.port === 587)) {
            (transportOptions as any).requireTLS = true;
        }

        try {
            this.transporter = nodemailer.createTransport(transportOptions);
            this.logger.log(
                `SMTP Transporter ready: ${config.host}:${config.port} ` +
                `user=${config.username} secure=${useImplicitSSL} requireTLS=${!useImplicitSSL && (config.tls || config.port === 587)}`
            );
        } catch (err) {
            this.transporter = null;
            this.logger.error(`Failed to create SMTP transporter: ${err.message}`);
        }
    }

    // ─── Test Connection ──────────────────────────────────────────────────────
    async testConnection(adminEmail: string): Promise<boolean> {
        // Always reload fresh from DB before testing
        await this.reloadTransporter();

        if (!this.transporter) {
            throw new Error(
                'SMTP not configured or password decryption failed. ' +
                'Please re-save your SMTP settings from the Admin Dashboard.'
            );
        }

        const config = await this.emailSettingModel.findOne().exec();

        // Step 1 — DNS resolution
        try {
            const dns = require('dns').promises;
            const addresses = await dns.resolve4(config.host);
            this.logger.log(`DNS resolved ${config.host} → ${addresses.join(', ')}`);
        } catch (dnsErr) {
            throw new Error(
                `Cannot resolve SMTP host "${config.host}". ` +
                `Verify the hostname is correct. (${dnsErr.message})`
            );
        }

        // Step 2 — Verify connection
        try {
            this.logger.log(`Verifying SMTP: ${config.host}:${config.port}...`);
            await this.transporter.verify();
            this.logger.log('SMTP verify() succeeded.');
        } catch (verifyErr) {
            const isTimeout = /timeout/i.test(verifyErr.message);
            let hint: string;

            if (isTimeout && config.port === 587) {
                hint = ' Port 587 appears blocked by your cloud host. Switch to port 465 with SSL enabled in the SMTP Config form.';
            } else if (isTimeout && config.port === 465) {
                hint = ' Port 465 appears blocked by your cloud host. Switch to port 587 with TLS enabled in the SMTP Config form.';
            } else if (isTimeout) {
                hint = ` Port ${config.port} appears unreachable. Try port 465 (SSL) or 587 (TLS).`;
            } else if (config.port === 465) {
                hint = ' Ensure SSL is supported and credentials are correct.';
            } else if (config.port === 587) {
                hint = ' Ensure STARTTLS is supported and credentials are correct.';
            } else {
                hint = '';
            }

            throw new Error(`SMTP connection failed: ${verifyErr.message}.${hint}`);
        }

        // Step 3 — Send test email
        try {
            this.logger.log(`Sending test email to ${adminEmail}...`);
            await this.transporter.sendMail({
                from: `"${config.from_name}" <${config.from_email}>`,
                to: adminEmail,
                subject: 'AriesXpert – SMTP Test Successful ✅',
                text: 'Your SMTP configuration is working correctly.',
                html: `
                    <div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
                        <h2 style="color:#26d07d;margin-top:0;">✅ SMTP Test Passed</h2>
                        <p>Your email server is configured correctly for <strong>AriesXpert</strong>.</p>
                        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:13px;">
                            <tr><td style="padding:6px 0;color:#888;">Host</td><td style="padding:6px 0;color:#e6eef3;">${config.host}</td></tr>
                            <tr><td style="padding:6px 0;color:#888;">Port</td><td style="padding:6px 0;color:#e6eef3;">${config.port}</td></tr>
                            <tr><td style="padding:6px 0;color:#888;">From</td><td style="padding:6px 0;color:#e6eef3;">${config.from_email}</td></tr>
                        </table>
                        <p style="font-size:11px;color:#555;">Automated test from AriesXpert Admin Dashboard.</p>
                    </div>
                `,
            });
            this.logger.log('✅ Test email sent successfully.');
            return true;
        } catch (sendErr) {
            this.logger.error(`SMTP send failed: ${sendErr.message}`);
            throw new Error(`SMTP connected but failed to send: ${sendErr.message}`);
        }
    }

    // ─── Core Internal Send Engine ────────────────────────────────────────────
    private async sendMail(to: string, subject: string, html: string): Promise<boolean> {
        // Lazy-init: try to load transporter if not ready
        if (!this.transporter) {
            await this.reloadTransporter();
        }

        if (!this.transporter) {
            const errMsg = 'SMTP not configured. Email sending is disabled. Configure SMTP from Admin Settings.';
            this.logger.error(errMsg);
            await this.emailLogModel.create({ recipient: to, subject, status: 'failed', error_message: errMsg });
            // Do NOT throw — we don't want to block user creation / clinic registration flows
            return false;
        }

        const config = await this.emailSettingModel.findOne().exec();

        try {
            await this.transporter.sendMail({
                from: `"${config.from_name}" <${config.from_email}>`,
                to,
                replyTo: config.reply_to || undefined,
                subject,
                html,
            });

            await this.emailLogModel.create({ recipient: to, subject, status: 'success' });
            this.logger.log(`Email sent to ${to} — "${subject}"`);
            return true;
        } catch (err) {
            this.logger.error(`Failed to send email to ${to}: ${err.message}`);
            await this.emailLogModel.create({
                recipient: to,
                subject,
                status: 'failed',
                error_message: err.message || 'Unknown SMTP Error',
            });
            // Return false instead of throwing — prevents breaking parent operations
            return false;
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUBLIC TEMPLATE METHODS
    // ──────────────────────────────────────────────────────────────────────────

    async sendPasswordResetEmail(email: string, userName: string, resetLink: string, expiryTimeStr: string) {
        return this.sendMail(
            email,
            'AriesXpert – Reset your Password',
            `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
                <h2 style="color:#26d07d;margin-top:0;">Password Reset Request</h2>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Click the button below to set a new password:</p>
                <a href="${resetLink}" style="display:inline-block;padding:12px 24px;background:#26d07d;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;margin:16px 0;">
                    Reset Password
                </a>
                <p style="font-size:12px;color:#888;">This link expires at: ${expiryTimeStr}</p>
                <p style="font-size:12px;color:#666;">If you did not request this, please ignore this email.</p>
            </div>`
        );
    }

    async getLogs(page = 1, limit = 50) {
        const logs = await this.emailLogModel.find()
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .exec();
        const total = await this.emailLogModel.countDocuments();
        return { logs, total, page, limit };
    }

    async sendManualMail(to: string, subject: string, body: string) {
        // Wrap plain body in basic HTML for premium look
        const html = `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:600px;">
            ${body.replace(/\n/g, '<br/>')}
        </div>`;
        return this.sendMail(to, subject, html);
    }

    async sendWelcomeEmail(email: string, name: string, tempPassword: string, loginUrl: string) {
        return this.sendMail(
            email,
            'Welcome to AriesXpert',
            `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
                <h2 style="color:#26d07d;margin-top:0;">Welcome, ${name}! 🎉</h2>
                <p>Your AriesXpert account has been created successfully.</p>
                <div style="background:rgba(255,255,255,0.05);padding:16px;border-radius:8px;margin:16px 0;font-size:13px;">
                    <p style="margin:4px 0;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color:#26d07d;">${loginUrl}</a></p>
                    <p style="margin:4px 0;"><strong>Email:</strong> ${email}</p>
                    <p style="margin:4px 0;"><strong>Temp Password:</strong> <code style="background:rgba(255,255,255,0.1);padding:2px 6px;border-radius:4px;">${tempPassword}</code></p>
                </div>
                <p style="color:#f59e0b;font-size:13px;">⚠️ Please login and change your password immediately.</p>
            </div>`
        );
    }

    async sendClinicRegistrationEmail(ownerEmail: string, clinicName: string, sysStatus: string) {
        return this.sendMail(
            ownerEmail,
            'Clinic Registration Received – AriesXpert',
            `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
                <h2 style="color:#26d07d;margin-top:0;">Registration Submitted 🏥</h2>
                <p>Thank you for submitting <strong>${clinicName}</strong> for registration.</p>
                <p>Current Status: <strong style="color:#f59e0b;">${sysStatus.toUpperCase()}</strong></p>
                <p>Our team will review your application and documents. You will be notified upon approval.</p>
                <p style="font-size:11px;color:#666;">AriesXpert Admin System</p>
            </div>`
        );
    }

    async sendInvoiceEmail(patientEmail: string, patientName: string, invoiceId: string, amount: number, downloadLink: string) {
        return this.sendMail(
            patientEmail,
            `Invoice #${invoiceId} – AriesXpert`,
            `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
                <h2 style="color:#26d07d;margin-top:0;">Invoice Generated 🧾</h2>
                <p>Hello <strong>${patientName}</strong>,</p>
                <p>An invoice of <strong>₹${amount}</strong> has been generated for you.</p>
                <a href="${downloadLink}" style="display:inline-block;padding:12px 24px;background:#26d07d;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;margin:16px 0;">
                    Download Invoice
                </a>
            </div>`
        );
    }

    async sendVerificationEmail(email: string, userName: string, verificationLink: string) {
        return this.sendMail(
            email,
            'AriesXpert – Verify your Email Address',
            `<div style="font-family:sans-serif;padding:24px;background:#07101a;color:#e6eef3;border-radius:12px;max-width:480px;">
                <h2 style="color:#26d07d;margin-top:0;">Email Verification</h2>
                <p>Hello <strong>${userName}</strong>,</p>
                <p>Verify your email address to complete your registration on AriesXpert:</p>
                <div style="text-align:center;margin:32px 0;">
                    <a href="${verificationLink}" style="display:inline-block;padding:14px 32px;background:#26d07d;color:#000;font-weight:bold;text-decoration:none;border-radius:8px;box-shadow:0 4px 12px rgba(38,208,125,0.2);">
                        Verify Email Address
                    </a>
                </div>
                <p style="font-size:12px;color:#888;">This link is single-use and expires in <strong>15 minutes</strong>.</p>
                <p style="font-size:12px;color:#666;border-top:1px solid rgba(255,255,255,0.05);padding-top:16px;margin-top:16px;">
                    If you did not request this verification, please contact support or secure your account.
                </p>
            </div>`
        );
    }
}
