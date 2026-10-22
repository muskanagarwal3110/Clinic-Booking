import { execSync } from 'node:child_process';
import dotenv from 'dotenv';

// Runs once before all test files: bring the test database up to the latest schema.
export default function setup() {
  dotenv.config({ path: '.env.test' });
  execSync('npx node-pg-migrate -m migrations --database-url-var DATABASE_URL up', {
    stdio: 'inherit',
    env: { ...process.env },
  });
}
