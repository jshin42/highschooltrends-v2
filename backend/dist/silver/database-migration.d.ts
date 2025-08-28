export interface MigrationInfo {
    version: string;
    description: string;
    applied_at: string;
}
export declare class SilverDatabaseMigration {
    private db;
    private logger;
    constructor(databasePath: string);
    private getErrorMessage;
    initialize(): Promise<void>;
    private runMigration;
    getMigrationHistory(): Promise<MigrationInfo[]>;
    validateSchema(): Promise<{
        isValid: boolean;
        errors: string[];
    }>;
    getSchemaInfo(): Promise<{
        tables: number;
        indexes: number;
        views: number;
        triggers: number;
        lastMigration?: MigrationInfo;
    }>;
    close(): void;
}
export declare function initializeSilverDatabase(databasePath: string): Promise<void>;
//# sourceMappingURL=database-migration.d.ts.map