import { SilverRecord, SilverStatistics, SilverHealthCheck, ExtractionStatus, ExtractionError } from './types';
export declare class SilverService {
    private db;
    private logger;
    constructor(databasePath?: string);
    private getErrorMessage;
    private initializeDatabase;
    createRecord(record: Omit<SilverRecord, 'id' | 'created_at' | 'updated_at'>): Promise<number>;
    getRecordById(id: number): Promise<SilverRecord | null>;
    getRecordByBronzeId(bronzeRecordId: number): Promise<SilverRecord | null>;
    getRecordsByStatus(status: ExtractionStatus): Promise<SilverRecord[]>;
    getRecordsBySchoolSlug(schoolSlug: string): Promise<SilverRecord[]>;
    updateRecordStatus(id: number, status: ExtractionStatus, confidence?: number, errors?: ExtractionError[]): Promise<void>;
    updateRecord(id: number, updates: Partial<SilverRecord>): Promise<void>;
    createRecordsBatch(records: Omit<SilverRecord, 'id' | 'created_at' | 'updated_at'>[]): Promise<number[]>;
    getStatistics(): Promise<SilverStatistics>;
    getHealthCheck(): Promise<SilverHealthCheck>;
    private deserializeRecord;
    deleteRecord(id: number): Promise<void>;
    close(): void;
}
//# sourceMappingURL=silver-service.d.ts.map