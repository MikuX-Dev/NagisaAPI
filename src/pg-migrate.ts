import { Client } from 'pg'

interface MigrationConfig {
  databaseUrl: string
}

class JaroWinklerMigration {
  private client: Client

  constructor(config: MigrationConfig) {
    this.client = new Client({
      connectionString: config.databaseUrl,
    })
  }

  async connect(): Promise<void> {
    try {
      await this.client.connect()
    } catch (error) {
      console.error('✗ Failed to connect to PostgreSQL:', error)
      throw error
    }
  }

  async disconnect(): Promise<void> {
    await this.client.end()
  }

  async checkPlPythonInstalled(): Promise<boolean> {
    try {
      const result = await this.client.query(`
        SELECT 1 FROM pg_available_extensions 
        WHERE name = 'plpython3u'
      `)
      return result.rowCount !== null && result.rowCount > 0
    } catch (error) {
      console.error('✗ Error checking PL/Python availability:', error)
      return false
    }
  }

  async enablePlPython(): Promise<void> {
    try {
      await this.client.query('CREATE EXTENSION IF NOT EXISTS plpython3u')
    } catch (error) {
      console.error('✗ Failed to enable plpython3u extension:', error)
      console.error(
        '  Make sure you have superuser privileges and PL/Python is installed',
      )
      throw error
    }
  }

  async checkJellyfishInstalled(): Promise<boolean> {
    try {
      const _result = await this.client.query(`
        DO LANGUAGE plpython3u $$
          try:
            import jellyfish
          except ImportError:
            plpy.error("jellyfish not installed")
        $$
      `)
      return true
    } catch (_error) {
      console.error('✗ jellyfish is not installed')
      console.error('  Run: sudo pip3 install jellyfish')
      return false
    }
  }

  async createJaroWinklerFunction(): Promise<void> {
    try {
      const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION jaro_winkler(text1 TEXT, text2 TEXT)
        RETURNS FLOAT
        AS $$
            import jellyfish
            
            # Handle NULL inputs
            if text1 is None or text2 is None:
                return None
            
            # Calculate Jaro-Winkler similarity
            return jellyfish.jaro_winkler_similarity(text1, text2)
        $$ LANGUAGE plpython3u IMMUTABLE;
      `

      await this.client.query(createFunctionSQL)
    } catch (error) {
      console.error('✗ Failed to create jaro_winkler function:', error)
      throw error
    }
  }

  async createHelperFunction(): Promise<void> {
    try {
      const helperFunctionSQL = `
        CREATE OR REPLACE FUNCTION jaro_winkler_match(text1 TEXT, text2 TEXT, threshold FLOAT DEFAULT 0.8)
        RETURNS BOOLEAN
        AS $$
            SELECT jaro_winkler(text1, text2) >= threshold;
        $$ LANGUAGE SQL IMMUTABLE;
      `

      await this.client.query(helperFunctionSQL)
    } catch (error) {
      console.error('✗ Failed to create jaro_winkler_match function:', error)
      throw error
    }
  }

  async addComments(): Promise<void> {
    try {
      await this.client.query(`
        COMMENT ON FUNCTION jaro_winkler(TEXT, TEXT) IS 
        'Calculates Jaro-Winkler similarity between two strings using Python jellyfish library. Returns a value between 0.0 (no similarity) and 1.0 (exact match).';
      `)

      await this.client.query(`
        COMMENT ON FUNCTION jaro_winkler_match(TEXT, TEXT, FLOAT) IS 
        'Returns TRUE if Jaro-Winkler similarity between two strings exceeds the threshold (default 0.8).';
      `)
    } catch (error) {
      console.error('✗ Failed to add comments:', error)
    }
  }

  async testFunction(): Promise<void> {
    try {
      const testCases = [
        { text1: 'hello', text2: 'hallo', expected: '~0.93' },
        { text1: 'PostgreSQL', text2: 'Postgres', expected: '~0.94' },
        { text1: 'MARTHA', text2: 'MARHTA', expected: '~0.96' },
      ]

      for (const test of testCases) {
        const _result = await this.client.query(
          'SELECT jaro_winkler($1, $2) as similarity',
          [test.text1, test.text2],
        )
      }
    } catch (error) {
      console.error('✗ Function tests failed:', error)
      throw error
    }
  }

  async createMigrationTable(): Promise<void> {
    try {
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          id SERIAL PRIMARY KEY,
          migration_name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `)
    } catch (error) {
      console.error('✗ Failed to create migrations table:', error)
      throw error
    }
  }

  async recordMigration(migrationName: string): Promise<void> {
    try {
      await this.client.query(
        'INSERT INTO schema_migrations (migration_name) VALUES ($1) ON CONFLICT (migration_name) DO NOTHING',
        [migrationName],
      )
    } catch (error) {
      console.error('✗ Failed to record migration:', error)
      throw error
    }
  }

  async isMigrationApplied(migrationName: string): Promise<boolean> {
    try {
      const result = await this.client.query(
        'SELECT 1 FROM schema_migrations WHERE migration_name = $1',
        [migrationName],
      )
      return result.rowCount !== null && result.rowCount > 0
    } catch (_error) {
      // If table doesn't exist, migration hasn't been applied
      return false
    }
  }

  async run(): Promise<void> {
    const migrationName = 'add_jaro_winkler_function_v1'

    try {
      await this.connect()
      await this.createMigrationTable()

      const alreadyApplied = await this.isMigrationApplied(migrationName)
      if (alreadyApplied) {
        return
      }

      const plPythonAvailable = await this.checkPlPythonInstalled()
      if (!plPythonAvailable) {
        throw new Error(
          'PL/Python extension not available. Please install it first.',
        )
      }

      await this.enablePlPython()

      const jellyfishInstalled = await this.checkJellyfishInstalled()
      if (!jellyfishInstalled) {
        throw new Error(
          'jellyfish library not installed. Please install it first.',
        )
      }

      await this.createJaroWinklerFunction()
      await this.createHelperFunction()
      await this.addComments()
      await this.testFunction()
      await this.recordMigration(migrationName)
    } catch (error) {
      throw error
    } finally {
      await this.disconnect()
    }
  }

  async rollback(): Promise<void> {
    const migrationName = 'add_jaro_winkler_function_v1'

    try {
      await this.connect()

      await this.client.query(
        'DROP FUNCTION IF EXISTS jaro_winkler_match(TEXT, TEXT, FLOAT)',
      )
      await this.client.query(
        'DROP FUNCTION IF EXISTS jaro_winkler(TEXT, TEXT)',
      )
      await this.client.query(
        'DELETE FROM schema_migrations WHERE migration_name = $1',
        [migrationName],
      )
    } catch (error) {
      throw error
    } finally {
      await this.disconnect()
    }
  }
}

// Main execution
async function main() {
  const config: MigrationConfig = {
    databaseUrl:
      process.env.DATABASE_URL ||
      'postgresql://postgres:password@localhost:5432/your_database',
  }

  const migration = new JaroWinklerMigration(config)

  const command = process.argv[2]

  try {
    if (command === 'rollback') {
      await migration.rollback()
    } else {
      await migration.run()
    }
    process.exit(0)
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

export { JaroWinklerMigration, type MigrationConfig }
