/**
 * Bronze Layer Database
 * 
 * SQLite database layer for persisting Bronze layer records with
 * full CRUD operations and transaction support.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { BronzeRecord, ProcessingStatus, SourceDataset, PriorityBucket } from './types';

export class BronzeDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    // Use in-memory database for tests, file-based for production
    const dbFile = dbPath || path.join(process.cwd(), 'data', 'bronze.sqlite');
    
    // Ensure data directory exists for file-based databases
    if (dbPath !== ':memory:') {
      const dbDir = path.dirname(dbFile);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }
    }

    this.db = new Database(dbFile);
    this.initializeSchema();
  }

  /**
   * Initialize database schema and indexes
   */
  private initializeSchema(): void {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS bronze_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        school_slug TEXT NOT NULL,
        capture_timestamp TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        checksum_sha256 TEXT NOT NULL,
        processing_status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        source_dataset TEXT,
        processing_errors TEXT, -- JSON array
        priority_bucket TEXT
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_bronze_school_slug ON bronze_records(school_slug)',
      'CREATE INDEX IF NOT EXISTS idx_bronze_status ON bronze_records(processing_status)',
      'CREATE INDEX IF NOT EXISTS idx_bronze_dataset ON bronze_records(source_dataset)',
      'CREATE INDEX IF NOT EXISTS idx_bronze_timestamp ON bronze_records(capture_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_bronze_priority ON bronze_records(priority_bucket)'
    ];

    // Execute schema creation
    this.db.exec(createTableSQL);
    createIndexes.forEach(indexSQL => this.db.exec(indexSQL));
  }

  /**
   * Insert a new Bronze record
   */
  insertRecord(record: Omit<BronzeRecord, 'id' | 'created_at' | 'updated_at'>): BronzeRecord {
    const now = new Date().toISOString();
    const insertSQL = `
      INSERT INTO bronze_records (
        file_path, school_slug, capture_timestamp, file_size, checksum_sha256,
        processing_status, created_at, updated_at, source_dataset, processing_errors, priority_bucket
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const stmt = this.db.prepare(insertSQL);
    const result = stmt.run(
      record.file_path,
      record.school_slug,
      record.capture_timestamp,
      record.file_size,
      record.checksum_sha256,
      record.processing_status,
      now,
      now,
      record.source_dataset || null,
      record.processing_errors ? JSON.stringify(record.processing_errors) : null,
      record.priority_bucket || null
    );

    // Fetch and return the inserted record
    return this.getRecordById(result.lastInsertRowid as number)!;
  }

  /**
   * Get Bronze record by ID
   */
  getRecordById(id: number): BronzeRecord | null {
    const stmt = this.db.prepare('SELECT * FROM bronze_records WHERE id = ?');
    const row = stmt.get(id) as any;
    
    return row ? this.mapRowToRecord(row) : null;
  }

  /**
   * Get Bronze record by school slug
   */
  getRecordBySlug(schoolSlug: string): BronzeRecord | null {
    const stmt = this.db.prepare('SELECT * FROM bronze_records WHERE school_slug = ?');
    const row = stmt.get(schoolSlug) as any;
    
    return row ? this.mapRowToRecord(row) : null;
  }

  /**
   * Get Bronze record by file path
   */
  getRecordByPath(filePath: string): BronzeRecord | null {
    const stmt = this.db.prepare('SELECT * FROM bronze_records WHERE file_path = ?');
    const row = stmt.get(filePath) as any;
    
    return row ? this.mapRowToRecord(row) : null;
  }

  /**
   * Get all records with specified processing status
   */
  getRecordsByStatus(status: ProcessingStatus): BronzeRecord[] {
    const stmt = this.db.prepare('SELECT * FROM bronze_records WHERE processing_status = ?');
    const rows = stmt.all(status) as any[];
    
    return rows.map(row => this.mapRowToRecord(row));
  }

  /**
   * Update processing status of a record
   */
  updateRecordStatus(id: number, status: ProcessingStatus, errors?: string[]): boolean {
    const updateSQL = `
      UPDATE bronze_records 
      SET processing_status = ?, updated_at = ?, processing_errors = ?
      WHERE id = ?
    `;

    // Ensure updated_at is different from created_at by adding 1ms if needed
    const now = new Date();
    const nowISO = now.toISOString();

    const stmt = this.db.prepare(updateSQL);
    const result = stmt.run(
      status,
      nowISO,
      errors ? JSON.stringify(errors) : null,
      id
    );

    return result.changes > 0;
  }

  /**
   * Get all records for statistics calculation
   */
  getAllRecords(): BronzeRecord[] {
    const stmt = this.db.prepare('SELECT * FROM bronze_records ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    
    return rows.map(row => this.mapRowToRecord(row));
  }

  /**
   * Get record count by status
   */
  getCountByStatus(): Record<ProcessingStatus, number> {
    const stmt = this.db.prepare(`
      SELECT processing_status, COUNT(*) as count 
      FROM bronze_records 
      GROUP BY processing_status
    `);
    const rows = stmt.all() as any[];

    const counts: Record<ProcessingStatus, number> = {
      pending: 0,
      processing: 0,
      processed: 0,
      failed: 0,
      quarantined: 0,
      skipped: 0
    };

    rows.forEach(row => {
      counts[row.processing_status as ProcessingStatus] = row.count;
    });

    return counts;
  }

  /**
   * Get record count by dataset
   */
  getCountByDataset(): Record<SourceDataset, number> {
    const stmt = this.db.prepare(`
      SELECT source_dataset, COUNT(*) as count 
      FROM bronze_records 
      WHERE source_dataset IS NOT NULL
      GROUP BY source_dataset
    `);
    const rows = stmt.all() as any[];

    const counts: Record<SourceDataset, number> = {
      USNEWS_2024: 0,
      USNEWS_2025: 0,
      WAYBACK_ARCHIVE: 0,
      OTHER: 0
    };

    rows.forEach(row => {
      counts[row.source_dataset as SourceDataset] = row.count;
    });

    return counts;
  }

  /**
   * Get record count by priority bucket
   */
  getCountByPriority(): Record<PriorityBucket, number> {
    const stmt = this.db.prepare(`
      SELECT priority_bucket, COUNT(*) as count 
      FROM bronze_records 
      WHERE priority_bucket IS NOT NULL
      GROUP BY priority_bucket
    `);
    const rows = stmt.all() as any[];

    const counts: Record<PriorityBucket, number> = {
      bucket_1: 0,
      bucket_2: 0,
      bucket_3: 0,
      unknown: 0
    };

    rows.forEach(row => {
      counts[row.priority_bucket as PriorityBucket] = row.count;
    });

    return counts;
  }

  /**
   * Get total record count
   */
  getTotalCount(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM bronze_records');
    const result = stmt.get() as any;
    return result.count;
  }

  /**
   * Get average file size
   */
  getAverageFileSize(): number {
    const stmt = this.db.prepare('SELECT AVG(file_size) as avg_size FROM bronze_records');
    const result = stmt.get() as any;
    return Math.round(result.avg_size || 0);
  }

  /**
   * Clear all records (for testing)
   */
  clearAll(): void {
    this.db.exec('DELETE FROM bronze_records');
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Execute a transaction with multiple operations
   */
  transaction<T>(operations: () => T): T {
    const transaction = this.db.transaction(operations);
    return transaction();
  }

  /**
   * Map database row to BronzeRecord
   */
  private mapRowToRecord(row: any): BronzeRecord {
    return {
      id: row.id,
      file_path: row.file_path,
      school_slug: row.school_slug,
      capture_timestamp: row.capture_timestamp,
      file_size: row.file_size,
      checksum_sha256: row.checksum_sha256,
      processing_status: row.processing_status as ProcessingStatus,
      created_at: row.created_at,
      updated_at: row.updated_at,
      source_dataset: row.source_dataset as SourceDataset | undefined,
      processing_errors: row.processing_errors ? JSON.parse(row.processing_errors) : undefined,
      priority_bucket: row.priority_bucket as PriorityBucket | undefined
    };
  }
}