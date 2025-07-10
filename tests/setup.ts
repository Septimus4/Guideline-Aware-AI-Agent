import dotenv from 'dotenv';

// Set NODE_ENV to test
process.env.NODE_ENV = 'test';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test timeout
jest.setTimeout(10000);
