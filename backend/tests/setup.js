import { beforeEach, afterAll } from 'vitest';
import { pool } from '../src/config/db.js';
import { resetDb } from './helpers.js';

beforeEach(resetDb);
afterAll(() => pool.end());
