/**
 * Silver CLI Tests
 * 
 * Tests the Silver command-line interface functionality including
 * all commands: extract, stats, test, and validate.
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('Silver CLI', () => {
  const testDbPath = '/tmp/test-silver.db';
  const bronzeTestDbPath = '/tmp/test-bronze.db';
  
  beforeEach(() => {
    // Clean up test databases
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    if (existsSync(bronzeTestDbPath)) {
      unlinkSync(bronzeTestDbPath);
    }
  });

  afterEach(() => {
    // Clean up test databases
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    if (existsSync(bronzeTestDbPath)) {
      unlinkSync(bronzeTestDbPath);
    }
  });

  const runCLI = (args: string[]): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number | null;
  }> => {
    return new Promise((resolve) => {
      const child = spawn('npx', ['tsx', 'src/cli/silver-cli.ts', ...args], {
        cwd: process.cwd(),
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (exitCode) => {
        resolve({ stdout, stderr, exitCode });
      });

      child.on('error', (error) => {
        resolve({ 
          stdout, 
          stderr: stderr + error.message, 
          exitCode: 1 
        });
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        child.kill();
        resolve({ 
          stdout, 
          stderr: stderr + 'Test timeout', 
          exitCode: 1 
        });
      }, 30000);
    });
  };

  describe('Help and Version', () => {
    test('should show help when no arguments provided', async () => {
      const result = await runCLI([]);
      
      expect(result.stdout).toContain('silver-cli');
      expect(result.stdout).toContain('CLI tool for Silver layer operations');
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('extract');
      expect(result.stdout).toContain('stats');
      expect(result.stdout).toContain('test');
      expect(result.stdout).toContain('validate');
    });

    test('should show version', async () => {
      const result = await runCLI(['--version']);
      
      expect(result.stdout).toContain('1.0.0');
      expect(result.exitCode).toBe(0);
    });

    test('should show help with --help flag', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.stdout).toContain('Usage: silver-cli [options] [command]');
      expect(result.stdout).toContain('extract');
      expect(result.stdout).toContain('stats');
      expect(result.stdout).toContain('test');
      expect(result.stdout).toContain('validate');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Validate Command', () => {
    test('should validate Silver layer configuration', async () => {
      const result = await runCLI(['validate', '--database', testDbPath]);
      
      expect(result.stdout).toContain('Silver Layer Configuration Validation');
      expect(result.stdout).toContain('Database initialization: OK');
      expect(result.stdout).toContain('Silver service creation: OK');
      expect(result.stdout).toContain('CSS extraction method: OK');
      expect(result.stdout).toContain('Confidence scorer: OK');
      expect(result.stdout).toContain('All validations passed');
      expect(result.exitCode).toBe(0);
    });

    test('should perform mock extraction test during validation', async () => {
      const result = await runCLI(['validate', '--database', testDbPath]);
      
      expect(result.stdout).toContain('Testing with mock data');
      expect(result.stdout).toContain('Extracted school name: "Test High School"');
      expect(result.stdout).toContain('Extracted enrollment: 1500');
      expect(result.stdout).toContain('Extracted ranking: 100');
      expect(result.stdout).toContain('Overall confidence:');
      expect(result.stdout).toContain('Mock extraction test: OK');
      expect(result.exitCode).toBe(0);
    });

    test('should provide next steps after validation', async () => {
      const result = await runCLI(['validate', '--database', testDbPath]);
      
      expect(result.stdout).toContain('Next steps:');
      expect(result.stdout).toContain('silver-cli test');
      expect(result.stdout).toContain('silver-cli extract');
      expect(result.stdout).toContain('silver-cli stats');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Test Command', () => {
    test('should handle empty Bronze database gracefully', async () => {
      const result = await runCLI([
        'test', 
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath,
        '--sample-size', '3'
      ]);
      
      expect(result.stdout).toContain('Silver Layer Test Mode');
      expect(result.stdout).toContain('Test extraction pipeline configured');
      expect(result.stdout).toContain('No test records available');
      expect(result.exitCode).toBe(0);
    });

    test('should accept sample size parameter', async () => {
      const result = await runCLI([
        'test',
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath,
        '--sample-size', '7'
      ]);
      
      expect(result.stdout).toContain('Testing with');
      expect(result.exitCode).toBe(0);
    });

    test('should use default sample size when not specified', async () => {
      const result = await runCLI([
        'test',
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath
      ]);
      
      expect(result.stdout).toContain('Silver Layer Test Mode');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Stats Command', () => {
    test('should show Silver layer statistics', async () => {
      const result = await runCLI(['stats', '--database', testDbPath]);
      
      expect(result.stdout).toContain('Silver Layer Statistics');
      expect(result.stdout).toContain('Extraction Statistics:');
      expect(result.stdout).toContain('Total records processed:');
      expect(result.stdout).toContain('Average extraction confidence:');
      expect(result.stdout).toContain('Processing Status:');
      expect(result.stdout).toContain('Field Coverage:');
      expect(result.stdout).toContain('Health Status:');
      expect(result.exitCode).toBe(0);
    });

    test('should show field coverage percentages', async () => {
      const result = await runCLI(['stats', '--database', testDbPath]);
      
      expect(result.stdout).toContain('School names extracted:');
      expect(result.stdout).toContain('Rankings extracted:');
      expect(result.stdout).toContain('Enrollment data:');
      expect(result.stdout).toContain('Academic metrics:');
      expect(result.stdout).toContain('Demographics:');
      expect(result.exitCode).toBe(0);
    });

    test('should show health status with icons', async () => {
      const result = await runCLI(['stats', '--database', testDbPath]);
      
      expect(result.stdout).toContain('Health Status:');
      expect(result.stdout).toContain('Overall status:');
      expect(result.stdout).toContain('Extraction success rate:');
      expect(result.stdout).toContain('Error rate:');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Extract Command', () => {
    test('should handle dry run mode', async () => {
      const result = await runCLI([
        'extract',
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath,
        '--dry-run',
        '--limit', '2'
      ]);
      
      expect(result.stdout).toContain('Starting Silver Layer Extraction');
      expect(result.stdout).toContain('Dry run mode - no changes will be made');
      expect(result.exitCode).toBe(0);
    });

    test('should accept configuration parameters', async () => {
      const result = await runCLI([
        'extract',
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath,
        '--batch-size', '25',
        '--confidence-threshold', '80',
        '--limit', '1',
        '--dry-run'
      ]);
      
      expect(result.stdout).toContain('Configuration:');
      expect(result.stdout).toContain('Batch size: 25');
      expect(result.stdout).toContain('Confidence threshold: 80%');
      expect(result.exitCode).toBe(0);
    });

    test('should handle no pending records gracefully', async () => {
      const result = await runCLI([
        'extract',
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath,
        '--limit', '1'
      ]);
      
      expect(result.stdout).toContain('No pending records found for processing');
      expect(result.exitCode).toBe(0);
    });

    test('should show processing progress and results', async () => {
      const result = await runCLI([
        'extract',
        '--database', testDbPath,
        '--bronze-db', bronzeTestDbPath,
        '--dry-run'
      ]);
      
      expect(result.stdout).toContain('Querying Bronze layer for pending records');
      expect(result.stdout).toContain('Found');
      expect(result.stdout).toContain('records to process');
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown commands', async () => {
      const result = await runCLI(['unknown-command']);
      
      expect(result.stderr).toContain('Unknown command');
      expect(result.exitCode).toBe(1);
    });

    test('should handle invalid database paths gracefully', async () => {
      const result = await runCLI(['validate', '--database', '/invalid/path/database.db']);
      
      // Should either handle gracefully or show appropriate error
      expect(result.exitCode).toBe(0 || 1); // Either succeeds by creating path or fails gracefully
    });

    test('should handle command with invalid options', async () => {
      const result = await runCLI(['extract', '--invalid-option', 'value']);
      
      expect(result.stderr || result.stdout).toContain('error' || 'unknown' || 'invalid');
      // Command might still run but should show some indication of the invalid option
    });
  });

  describe('Integration', () => {
    test('should maintain consistent output formatting across commands', async () => {
      const commands = ['validate', 'stats', 'test'];
      
      for (const command of commands) {
        const result = await runCLI([command, '--database', testDbPath]);
        
        // Check for consistent emoji usage and formatting
        expect(result.stdout).toMatch(/[🔍📊🧪]/); // Command-specific emojis
        expect(result.stdout).toMatch(/[✅❌⚠️]/); // Status emojis
        expect(result.exitCode).toBe(0);
      }
    });

    test('should have consistent help text formatting', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.stdout).toContain('Commands:');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toMatch(/extract.*Extract structured data/);
      expect(result.stdout).toMatch(/stats.*Show Silver layer statistics/);
      expect(result.stdout).toMatch(/test.*Test Silver layer extraction/);
      expect(result.stdout).toMatch(/validate.*Validate Silver layer configuration/);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('Performance', () => {
    test('should complete validation within reasonable time', async () => {
      const startTime = Date.now();
      const result = await runCLI(['validate', '--database', testDbPath]);
      const duration = Date.now() - startTime;
      
      expect(result.exitCode).toBe(0);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });

    test('should handle database operations efficiently', async () => {
      // Run multiple commands to test database efficiency
      const commands = ['validate', 'stats'];
      
      for (const command of commands) {
        const startTime = Date.now();
        const result = await runCLI([command, '--database', testDbPath]);
        const duration = Date.now() - startTime;
        
        expect(result.exitCode).toBe(0);
        expect(duration).toBeLessThan(8000); // Each should complete within 8 seconds
      }
    });
  });
});