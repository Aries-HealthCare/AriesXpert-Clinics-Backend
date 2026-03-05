import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Injectable()
export class DbDebugService implements OnModuleInit {
    constructor(@InjectConnection() private connection: Connection) { }

    async onModuleInit() {
        try {
            const collections = await this.connection.db.listCollections().toArray();
            console.log('--- DB DEBUG ---');
            for (const col of collections) {
                if (col.name === 'leads') {
                    const indexes = await this.connection.db.collection('leads').indexes();
                    console.log('Leads Indexes:', JSON.stringify(indexes, null, 2));
                }
            }
            console.log('--- END DB DEBUG ---');
        } catch (e) {
            console.error('DB Debug failed', e);
        }
    }
}
