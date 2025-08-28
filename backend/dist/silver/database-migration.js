import Database from 'better-sqlite3';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { StructuredLogger } from '../common/logger';
export class SilverDatabaseMigration {
    db;
    logger;
    constructor(databasePath) {
        this.db = new Database(databasePath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('foreign_keys = ON');
        this.logger = StructuredLogger.getInstance().withContext({ component: 'SilverDatabaseMigration' });
    }
    getErrorMessage(error) {
        if (error instanceof Error)
            return error.message;
        return String(error);
    }
    async initialize() {
        const timer = this.logger.startTimer('initialize_database');
        try {
            // Create migrations tracking table if it doesn't exist
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version TEXT PRIMARY KEY,
          description TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
      `);
            // Check if Silver schema already exists
            const tableExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='silver_records'
      `).get();
            if (!tableExists) {
                await this.runMigration('1.0.0', 'Initial Silver layer schema');
            }
            timer.end('Database initialization completed');
        }
        catch (error) {
            this.logger.error('Database initialization failed', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    async runMigration(version, description) {
        const timer = this.logger.startTimer('run_migration', { version, description });
        try {
            // Check if migration already applied
            const existingMigration = this.db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version);
            if (existingMigration) {
                this.logger.info('Migration already applied', { version });
                return;
            }
            // Load and execute schema
            const schemaPath = join(__dirname, 'database-schema.sql');
            if (!existsSync(schemaPath)) {
                throw new Error(`Schema file not found: ${schemaPath}`);
            }
            const schemaSQL = readFileSync(schemaPath, 'utf-8');
            // Execute migration in transaction
            const transaction = this.db.transaction(() => {
                // Execute schema SQL
                this.db.exec(schemaSQL);
                // Record migration
                this.db.prepare(`
          INSERT INTO schema_migrations (version, description)
          VALUES (?, ?)
        `).run(version, description);
            });
            transaction();
            timer.end('Migration completed successfully');
            this.logger.info('Migration completed successfully', { version, description });
        }
        catch (error) {
            this.logger.error('Migration failed', { error_message: this.getErrorMessage(error) });
            throw new Error(`Migration failed for version ${version}: ${error}`);
        }
    }
    async getMigrationHistory() {
        try {
            const migrations = this.db.prepare(`
        SELECT version, description, applied_at 
        FROM schema_migrations 
        ORDER BY applied_at ASC
      `).all();
            return migrations;
        }
        catch (error) {
            this.logger.error('Failed to get migration history', { error_message: this.getErrorMessage(error) });
            return [];
        }
    }
    async validateSchema() {
        const errors = [];
        try {
            // Check that silver_records table exists with expected columns
            const tableInfo = this.db.prepare(`
        PRAGMA table_info(silver_records)
      `).all();
            const expectedColumns = [
                'id', 'bronze_record_id', 'school_slug', 'source_year',
                'school_name', 'nces_id', 'grades_served',
                'address_street', 'address_city', 'address_state', 'address_zip',
                'phone', 'website', 'setting',
                'enrollment', 'student_teacher_ratio', 'full_time_teachers',
                'national_rank', 'state_rank',
                'ap_participation_rate', 'ap_pass_rate', 'math_proficiency',
                'reading_proficiency', 'science_proficiency', 'graduation_rate',
                'college_readiness_index',
                'white_pct', 'asian_pct', 'hispanic_pct', 'black_pct',
                'american_indian_pct', 'two_or_more_pct', 'female_pct', 'male_pct',
                'economically_disadvantaged_pct', 'free_lunch_pct', 'reduced_lunch_pct',
                'extraction_status', 'extraction_confidence', 'field_confidence',
                'processing_errors', 'created_at', 'updated_at'
            ];
            const actualColumns = tableInfo.map(col => col.name);
            for (const expectedCol of expectedColumns) {
                if (!actualColumns.includes(expectedCol)) {
                    errors.push(`Missing column: ${expectedCol}`);
                }
            }
            // Check indexes exist
            const indexes = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='index' AND tbl_name='silver_records'
      `).all();
            const expectedIndexes = [
                'idx_silver_bronze_record',
                'idx_silver_school_slug',
                'idx_silver_extraction_status',
                'idx_silver_source_year',
                'idx_silver_national_rank',
                'idx_silver_state_rank',
                'idx_silver_confidence'
            ];
            const actualIndexes = indexes.map(idx => idx.name);
            for (const expectedIdx of expectedIndexes) {
                if (!actualIndexes.includes(expectedIdx)) {
                    errors.push(`Missing index: ${expectedIdx}`);
                }
            }
            // Check view exists
            const viewExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='view' AND name='v_silver_statistics'
      `).get();
            if (!viewExists) {
                errors.push('Missing view: v_silver_statistics');
            }
            // Check trigger exists
            const triggerExists = this.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='trigger' AND name='trigger_silver_updated_at'
      `).get();
            if (!triggerExists) {
                errors.push('Missing trigger: trigger_silver_updated_at');
            }
            return {
                isValid: errors.length === 0,
                errors
            };
        }
        catch (error) {
            errors.push(`Schema validation failed: ${error}`);
            return { isValid: false, errors };
        }
    }
    async getSchemaInfo() {
        try {
            // Count database objects
            const objects = this.db.prepare(`
        SELECT type, COUNT(*) as count 
        FROM sqlite_master 
        WHERE tbl_name = 'silver_records' OR name LIKE '%silver%'
        GROUP BY type
      `).all();
            const counts = {};
            objects.forEach(obj => {
                counts[obj.type] = obj.count;
            });
            // Get last migration
            const lastMigration = this.db.prepare(`
        SELECT version, description, applied_at 
        FROM schema_migrations 
        ORDER BY applied_at DESC 
        LIMIT 1
      `).get();
            return {
                tables: counts.table || 0,
                indexes: counts.index || 0,
                views: counts.view || 0,
                triggers: counts.trigger || 0,
                lastMigration
            };
        }
        catch (error) {
            this.logger.error('Failed to get schema info', { error_message: this.getErrorMessage(error) });
            return {
                tables: 0,
                indexes: 0,
                views: 0,
                triggers: 0
            };
        }
    }
    close() {
        this.db.close();
    }
}
// Utility function for easy initialization
export async function initializeSilverDatabase(databasePath) {
    const migration = new SilverDatabaseMigration(databasePath);
    try {
        await migration.initialize();
        // Validate schema after initialization
        const validation = await migration.validateSchema();
        if (!validation.isValid) {
            throw new Error(`Schema validation failed: ${validation.errors.join(', ')}`);
        }
    }
    finally {
        migration.close();
    }
}
//# sourceMappingURL=database-migration.js.map