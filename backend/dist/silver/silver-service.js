import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';
import { StructuredLogger } from '../common/logger';
export class SilverService {
    db;
    logger;
    constructor(databasePath = './data/highschooltrends.db') {
        this.db = new Database(databasePath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('synchronous = NORMAL');
        this.db.pragma('foreign_keys = ON');
        this.logger = StructuredLogger.getInstance().withContext({ component: 'SilverService' });
        this.initializeDatabase();
    }
    getErrorMessage(error) {
        if (error instanceof Error)
            return error.message;
        return String(error);
    }
    initializeDatabase() {
        const schemaSQL = readFileSync(join(__dirname, 'database-schema.sql'), 'utf-8');
        // Execute schema creation
        this.db.exec(schemaSQL);
        this.logger.info('Silver database schema initialized');
    }
    // Core CRUD Operations
    async createRecord(record) {
        const timer = this.logger.startTimer('create_silver_record');
        try {
            const stmt = this.db.prepare(`
        INSERT INTO silver_records (
          bronze_record_id, school_slug, source_year,
          school_name, nces_id, grades_served,
          address_street, address_city, address_state, address_zip,
          phone, website, setting,
          enrollment, student_teacher_ratio, full_time_teachers,
          national_rank, state_rank,
          ap_participation_rate, ap_pass_rate, math_proficiency,
          reading_proficiency, science_proficiency, graduation_rate,
          college_readiness_index,
          white_pct, asian_pct, hispanic_pct, black_pct,
          american_indian_pct, two_or_more_pct, female_pct, male_pct,
          economically_disadvantaged_pct, free_lunch_pct, reduced_lunch_pct,
          extraction_status, extraction_confidence, field_confidence,
          processing_errors
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
            const result = stmt.run(record.bronze_record_id, record.school_slug, record.source_year, record.school_name, record.nces_id, record.grades_served, record.address_street, record.address_city, record.address_state, record.address_zip, record.phone, record.website, record.setting, record.enrollment, record.student_teacher_ratio, record.full_time_teachers, record.national_rank, record.state_rank, record.ap_participation_rate, record.ap_pass_rate, record.math_proficiency, record.reading_proficiency, record.science_proficiency, record.graduation_rate, record.college_readiness_index, record.white_pct, record.asian_pct, record.hispanic_pct, record.black_pct, record.american_indian_pct, record.two_or_more_pct, record.female_pct, record.male_pct, record.economically_disadvantaged_pct, record.free_lunch_pct, record.reduced_lunch_pct, record.extraction_status, record.extraction_confidence, JSON.stringify(record.field_confidence), JSON.stringify(record.processing_errors));
            timer.end('Record created successfully', { record_id: result.lastInsertRowid });
            return result.lastInsertRowid;
        }
        catch (error) {
            this.logger.error('Failed to create record', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    async getRecordById(id) {
        const stmt = this.db.prepare('SELECT * FROM silver_records WHERE id = ?');
        const result = stmt.get(id);
        if (!result)
            return null;
        return this.deserializeRecord(result);
    }
    async getRecordByBronzeId(bronzeRecordId) {
        const stmt = this.db.prepare('SELECT * FROM silver_records WHERE bronze_record_id = ?');
        const result = stmt.get(bronzeRecordId);
        if (!result)
            return null;
        return this.deserializeRecord(result);
    }
    async getRecordsByStatus(status) {
        const stmt = this.db.prepare('SELECT * FROM silver_records WHERE extraction_status = ?');
        const results = stmt.all(status);
        return results.map(result => this.deserializeRecord(result));
    }
    async getRecordsBySchoolSlug(schoolSlug) {
        const stmt = this.db.prepare('SELECT * FROM silver_records WHERE school_slug = ?');
        const results = stmt.all(schoolSlug);
        return results.map(result => this.deserializeRecord(result));
    }
    async updateRecordStatus(id, status, confidence, errors) {
        const timer = this.logger.startTimer('update_record_status');
        try {
            let sql = 'UPDATE silver_records SET extraction_status = ?';
            const params = [status];
            if (confidence !== undefined) {
                sql += ', extraction_confidence = ?';
                params.push(confidence);
            }
            if (errors !== undefined) {
                sql += ', processing_errors = ?';
                params.push(JSON.stringify(errors));
            }
            sql += ' WHERE id = ?';
            params.push(id);
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            if (result.changes === 0) {
                throw new Error(`Silver record ${id} not found`);
            }
            timer.end('Status updated successfully', { record_id: id, new_status: status });
        }
        catch (error) {
            this.logger.error('Failed to create record', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    async updateRecord(id, updates) {
        const timer = this.logger.startTimer('update_silver_record');
        try {
            const fields = [];
            const params = [];
            Object.entries(updates).forEach(([key, value]) => {
                if (key === 'id' || key === 'created_at' || key === 'updated_at')
                    return;
                if (key === 'field_confidence' || key === 'processing_errors') {
                    fields.push(`${key} = ?`);
                    params.push(JSON.stringify(value));
                }
                else {
                    fields.push(`${key} = ?`);
                    params.push(value);
                }
            });
            if (fields.length === 0)
                return;
            const sql = `UPDATE silver_records SET ${fields.join(', ')} WHERE id = ?`;
            params.push(id);
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...params);
            if (result.changes === 0) {
                throw new Error(`Silver record ${id} not found`);
            }
            timer.end('Record updated successfully', { record_id: id, fields_updated: fields.length });
        }
        catch (error) {
            this.logger.error('Failed to create record', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    // Batch Operations
    async createRecordsBatch(records) {
        const timer = this.logger.startTimer('create_records_batch');
        try {
            const stmt = this.db.prepare(`
        INSERT INTO silver_records (
          bronze_record_id, school_slug, source_year,
          school_name, nces_id, grades_served,
          address_street, address_city, address_state, address_zip,
          phone, website, setting,
          enrollment, student_teacher_ratio, full_time_teachers,
          national_rank, state_rank,
          ap_participation_rate, ap_pass_rate, math_proficiency,
          reading_proficiency, science_proficiency, graduation_rate,
          college_readiness_index,
          white_pct, asian_pct, hispanic_pct, black_pct,
          american_indian_pct, two_or_more_pct, female_pct, male_pct,
          economically_disadvantaged_pct, free_lunch_pct, reduced_lunch_pct,
          extraction_status, extraction_confidence, field_confidence,
          processing_errors
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `);
            const transaction = this.db.transaction((recordsToProcess) => {
                const insertedIds = [];
                for (const record of recordsToProcess) {
                    const result = stmt.run(record.bronze_record_id, record.school_slug, record.source_year, record.school_name, record.nces_id, record.grades_served, record.address_street, record.address_city, record.address_state, record.address_zip, record.phone, record.website, record.setting, record.enrollment, record.student_teacher_ratio, record.full_time_teachers, record.national_rank, record.state_rank, record.ap_participation_rate, record.ap_pass_rate, record.math_proficiency, record.reading_proficiency, record.science_proficiency, record.graduation_rate, record.college_readiness_index, record.white_pct, record.asian_pct, record.hispanic_pct, record.black_pct, record.american_indian_pct, record.two_or_more_pct, record.female_pct, record.male_pct, record.economically_disadvantaged_pct, record.free_lunch_pct, record.reduced_lunch_pct, record.extraction_status, record.extraction_confidence, JSON.stringify(record.field_confidence), JSON.stringify(record.processing_errors));
                    insertedIds.push(result.lastInsertRowid);
                }
                return insertedIds;
            });
            const insertedIds = transaction(records);
            timer.end('Batch creation completed', { records_created: insertedIds.length });
            return insertedIds;
        }
        catch (error) {
            this.logger.error('Failed to create record', { error_message: this.getErrorMessage(error) });
            throw error;
        }
    }
    // Statistics and Monitoring
    async getStatistics() {
        const stmt = this.db.prepare('SELECT * FROM v_silver_statistics');
        const stats = stmt.get();
        if (!stats) {
            return {
                total_records_processed: 0,
                records_by_status: {
                    pending: 0,
                    extracting: 0,
                    extracted: 0,
                    failed: 0,
                    partial: 0
                },
                records_by_year: {},
                average_confidence_by_field: {
                    school_name: 0,
                    rankings: 0,
                    academics: 0,
                    demographics: 0,
                    location: 0,
                    enrollment_data: 0
                },
                field_extraction_success_rates: {},
                processing_rate: 0,
                last_updated: new Date().toISOString()
            };
        }
        // Get records by year
        const yearStmt = this.db.prepare('SELECT source_year, COUNT(*) as count FROM silver_records GROUP BY source_year');
        const yearStats = yearStmt.all();
        const records_by_year = {};
        yearStats.forEach(stat => {
            records_by_year[stat.source_year] = stat.count;
        });
        // Calculate field success rates
        const fieldSuccessRates = {};
        const totalRecords = stats.total_records || 1;
        fieldSuccessRates.school_name = (stats.school_name_coverage / totalRecords) * 100;
        fieldSuccessRates.national_rank = (stats.national_rank_coverage / totalRecords) * 100;
        fieldSuccessRates.enrollment = (stats.enrollment_coverage / totalRecords) * 100;
        fieldSuccessRates.graduation_rate = (stats.graduation_rate_coverage / totalRecords) * 100;
        return {
            total_records_processed: stats.total_records || 0,
            records_by_status: {
                pending: stats.pending_count || 0,
                extracting: stats.extracting_count || 0,
                extracted: stats.extracted_count || 0,
                failed: stats.failed_count || 0,
                partial: stats.partial_count || 0
            },
            records_by_year,
            average_confidence_by_field: {
                school_name: 0, // TODO: Calculate from field_confidence JSON
                rankings: 0,
                academics: 0,
                demographics: 0,
                location: 0,
                enrollment_data: 0
            },
            field_extraction_success_rates: fieldSuccessRates,
            processing_rate: 0, // TODO: Calculate based on recent processing times
            last_updated: stats.last_updated || new Date().toISOString()
        };
    }
    async getHealthCheck() {
        const stats = await this.getStatistics();
        const totalRecords = stats.total_records_processed;
        if (totalRecords === 0) {
            return {
                status: 'healthy',
                issues: [],
                metrics: {
                    extraction_success_rate: 100,
                    average_confidence_score: 0,
                    processing_queue_size: 0,
                    error_rate_pct: 0,
                    last_successful_batch: new Date().toISOString()
                }
            };
        }
        const failedRecords = stats.records_by_status.failed;
        const extractedRecords = stats.records_by_status.extracted + stats.records_by_status.partial;
        const errorRate = totalRecords > 0 ? (failedRecords / totalRecords) * 100 : 0;
        const successRate = totalRecords > 0 ? (extractedRecords / totalRecords) * 100 : 100;
        const issues = [];
        let status = 'healthy';
        if (errorRate > 10) {
            status = 'unhealthy';
            issues.push(`High error rate: ${errorRate.toFixed(1)}%`);
        }
        else if (errorRate > 5) {
            status = 'degraded';
            issues.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
        }
        if (stats.records_by_status.pending > 1000) {
            if (status === 'healthy')
                status = 'degraded';
            issues.push(`Large processing queue: ${stats.records_by_status.pending} pending records`);
        }
        return {
            status,
            issues,
            metrics: {
                extraction_success_rate: successRate,
                average_confidence_score: 0, // TODO: Calculate from confidence scores
                processing_queue_size: stats.records_by_status.pending,
                error_rate_pct: errorRate,
                last_successful_batch: stats.last_updated
            }
        };
    }
    // Utility Methods
    deserializeRecord(row) {
        return {
            ...row,
            field_confidence: JSON.parse(row.field_confidence || '{}'),
            processing_errors: JSON.parse(row.processing_errors || '[]')
        };
    }
    async deleteRecord(id) {
        const stmt = this.db.prepare('DELETE FROM silver_records WHERE id = ?');
        const result = stmt.run(id);
        if (result.changes === 0) {
            throw new Error(`Silver record ${id} not found`);
        }
    }
    close() {
        this.db.close();
    }
}
//# sourceMappingURL=silver-service.js.map