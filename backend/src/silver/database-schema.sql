-- Silver Layer Database Schema
-- Stores structured data extracted from Bronze layer HTML files

CREATE TABLE IF NOT EXISTS silver_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bronze_record_id INTEGER NOT NULL,
    school_slug TEXT NOT NULL,
    source_year INTEGER NOT NULL,
    
    -- Core School Information
    school_name TEXT,
    nces_id TEXT,
    grades_served TEXT,
    
    -- Location Data
    address_street TEXT,
    address_city TEXT,
    address_state TEXT,
    address_zip TEXT,
    phone TEXT,
    website TEXT,
    setting TEXT,
    
    -- Enrollment and Staffing
    enrollment INTEGER,
    student_teacher_ratio TEXT,
    full_time_teachers INTEGER,
    
    -- Rankings
    national_rank INTEGER,
    state_rank INTEGER,
    
    -- Academic Performance (stored as percentages: 0-100)
    ap_participation_rate REAL,
    ap_pass_rate REAL,
    math_proficiency REAL,
    reading_proficiency REAL,
    science_proficiency REAL,
    graduation_rate REAL,
    college_readiness_index REAL,
    
    -- Demographics (all percentages: 0-100)
    white_pct REAL,
    asian_pct REAL,
    hispanic_pct REAL,
    black_pct REAL,
    american_indian_pct REAL,
    two_or_more_pct REAL,
    female_pct REAL,
    male_pct REAL,
    
    -- Socioeconomic (often null in US News data)
    economically_disadvantaged_pct REAL,
    free_lunch_pct REAL,
    reduced_lunch_pct REAL,
    
    -- Processing metadata
    extraction_status TEXT NOT NULL DEFAULT 'pending',
    extraction_confidence REAL NOT NULL DEFAULT 0.0,
    field_confidence TEXT NOT NULL DEFAULT '{}', -- JSON blob
    processing_errors TEXT DEFAULT '[]', -- JSON array
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    -- Constraints
    -- FOREIGN KEY (bronze_record_id) REFERENCES bronze_records(id), -- Disabled for testing
    UNIQUE(bronze_record_id), -- One Silver record per Bronze record
    CHECK (extraction_status IN ('pending', 'extracting', 'extracted', 'failed', 'partial')),
    CHECK (extraction_confidence >= 0.0 AND extraction_confidence <= 100.0),
    CHECK (source_year >= 2020 AND source_year <= 2030)
);

-- Indexes for query performance
CREATE INDEX IF NOT EXISTS idx_silver_bronze_record ON silver_records(bronze_record_id);
CREATE INDEX IF NOT EXISTS idx_silver_school_slug ON silver_records(school_slug);
CREATE INDEX IF NOT EXISTS idx_silver_extraction_status ON silver_records(extraction_status);
CREATE INDEX IF NOT EXISTS idx_silver_source_year ON silver_records(source_year);
CREATE INDEX IF NOT EXISTS idx_silver_national_rank ON silver_records(national_rank) WHERE national_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_silver_state_rank ON silver_records(state_rank) WHERE state_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_silver_confidence ON silver_records(extraction_confidence);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_silver_updated_at 
    AFTER UPDATE ON silver_records
    FOR EACH ROW
BEGIN
    UPDATE silver_records 
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
END;

-- Statistics view for monitoring
CREATE VIEW IF NOT EXISTS v_silver_statistics AS
SELECT 
    COUNT(*) as total_records,
    COUNT(CASE WHEN extraction_status = 'pending' THEN 1 END) as pending_count,
    COUNT(CASE WHEN extraction_status = 'extracting' THEN 1 END) as extracting_count,
    COUNT(CASE WHEN extraction_status = 'extracted' THEN 1 END) as extracted_count,
    COUNT(CASE WHEN extraction_status = 'failed' THEN 1 END) as failed_count,
    COUNT(CASE WHEN extraction_status = 'partial' THEN 1 END) as partial_count,
    AVG(extraction_confidence) as avg_confidence,
    COUNT(CASE WHEN school_name IS NOT NULL THEN 1 END) as school_name_coverage,
    COUNT(CASE WHEN national_rank IS NOT NULL THEN 1 END) as national_rank_coverage,
    COUNT(CASE WHEN enrollment IS NOT NULL THEN 1 END) as enrollment_coverage,
    COUNT(CASE WHEN graduation_rate IS NOT NULL THEN 1 END) as graduation_rate_coverage,
    MIN(created_at) as first_record,
    MAX(updated_at) as last_updated
FROM silver_records;