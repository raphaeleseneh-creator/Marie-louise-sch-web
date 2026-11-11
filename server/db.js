import "dotenv/config";
import mysql from "mysql2/promise";
import { attachDatabasePool } from '@vercel/functions';
import { databaseOptions } from './database-config.js';

export const pool = mysql.createPool(databaseOptions(process.env));
if (process.env.VERCEL) attachDatabasePool(pool.pool);
