/**
 * Bronze Layer Database
 *
 * SQLite database layer for persisting Bronze layer records with
 * full CRUD operations and transaction support.
 */
import { BronzeRecord, ProcessingStatus, SourceDataset, PriorityBucket } from './types';
import { StructuredLogger } from '../common/logger';
export declare class BronzeDatabase {
    private db;
    private logger;
    constructor(dbPath?: string, logger?: StructuredLogger);
    /**
     * Initialize database connection and schema
     */
    initialize(): void;
    /**
     * Initialize database schema and indexes
     */
    private initializeSchema;
    /**
     * Insert a new Bronze record
     */
    insertRecord(record: Omit<BronzeRecord, 'id' | 'created_at' | 'updated_at'>): BronzeRecord;
    /**
     * Get Bronze record by ID
     */
    getRecordById(id: number): BronzeRecord | null;
    /**
     * Get Bronze record by school slug
     */
    getRecordBySlug(schoolSlug: string): BronzeRecord | null;
    /**
     * Get Bronze record by file path
     */
    getRecordByPath(filePath: string): BronzeRecord | null;
    /**
     * Get all records with specified processing status
     */
    getRecordsByStatus(status: ProcessingStatus): BronzeRecord[];
    /**
     * Update processing status of a record
     */
    updateRecordStatus(id: number, status: ProcessingStatus, errors?: string[]): boolean;
    /**
     * Get all records for statistics calculation
     */
    getAllRecords(): BronzeRecord[];
    /**
     * Get record count by status
     */
    getCountByStatus(): Record<ProcessingStatus, number>;
    /**
     * Get record count by dataset
     */
    getCountByDataset(): Record<SourceDataset, number>;
    /**
     * Get record count by priority bucket
     */
    getCountByPriority(): Record<PriorityBucket, number>;
    /**
     * Get total record count
     */
    getTotalCount(): number;
    /**
     * Get average file size
     */
    getAverageFileSize(): number;
    /**
     * Clear all records (for testing)
     */
    clearAll(): void;
    /**
     * Close database connection
     */
    close(): void;
    /**
     * Execute a transaction with multiple operations
     */
    transaction<T>(operations: () => T): T;
    /**
     * Map database row to BronzeRecord
     */
    private mapRowToRecord;
}
//# sourceMappingURL=database.d.ts.map