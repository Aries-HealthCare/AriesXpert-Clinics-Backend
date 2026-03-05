import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PushNotificationsService implements OnModuleInit {
    private readonly logger = new Logger(PushNotificationsService.name);
    private firebaseApp: admin.app.App | null = null;

    constructor(private configService: ConfigService) { }

    onModuleInit() {
        try {
            const serviceAccount = this.configService.get<string>('FIREBASE_SERVICE_ACCOUNT_JSON');
            if (serviceAccount) {
                const credentials = JSON.parse(serviceAccount);
                this.firebaseApp = admin.initializeApp({
                    credential: admin.credential.cert(credentials),
                });
                this.logger.log('Firebase Admin initialized successfully');
            } else {
                this.logger.warn('FIREBASE_SERVICE_ACCOUNT_JSON not found in environment. Push notifications will be disabled.');
            }
        } catch (error) {
            if (admin.apps.length > 0) {
                this.firebaseApp = admin.app();
                this.logger.log('Firebase Admin already initialized');
            } else {
                this.logger.error('Failed to initialize Firebase Admin:', error.message);
            }
        }
    }

    async sendToTherapist(fcmToken: string, payload: { title: string; body: string; data?: any }) {
        if (!this.firebaseApp && admin.apps.length === 0) {
            this.logger.warn('Firebase app not initialized, skipping push notification');
            return;
        }

        if (!fcmToken) return;

        try {
            const message: admin.messaging.Message = {
                token: fcmToken,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data || {},
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        channelId: 'broadcast_leads',
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            category: 'broadcast_leads',
                        },
                    },
                },
            };

            await admin.messaging().send(message);
            this.logger.log(`Push notification sent to token: ${fcmToken.substring(0, 10)}...`);
        } catch (error) {
            this.logger.error(`Error sending push notification: ${error.message}`);
        }
    }

    async broadcastToMultiple(fcmTokens: string[], payload: { title: string; body: string; data?: any }) {
        if (!fcmTokens || fcmTokens.length === 0) return;

        // Filter out invalid/empty tokens
        const validTokens = fcmTokens.filter(t => t && t.trim().length > 0);
        if (validTokens.length === 0) return;

        this.logger.log(`Broadcasting push notification to ${validTokens.length} devices. Tokens: ${validTokens.map(t => t.substring(0, 10)).join(', ')}`);

        // Messaging.sendEachForMulticast is efficient for this
        try {

            const message: admin.messaging.MulticastMessage = {
                tokens: validTokens,
                notification: {
                    title: payload.title,
                    body: payload.body,
                },
                data: payload.data || {},
                android: {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
                        channelId: 'broadcast_leads',
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(message);
            this.logger.log(`Successfully sent ${response.successCount} notifications; ${response.failureCount} failed.`);
        } catch (error) {
            this.logger.error(`Error in multicast broadcast: ${error.message}`);
        }
    }
}
