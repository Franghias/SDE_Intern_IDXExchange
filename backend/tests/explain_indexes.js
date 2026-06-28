/**
 * Week 3 — EXPLAIN Index Verification Script
 *
 * This script runs EXPLAIN on several representative queries to verify
 * that the database indexes are being used. Run it manually after
 * creating the indexes:
 *
 *   1. Run indexes:   docker exec -i idx-mysql-local mysql -uroot -prootpassword rets < database/add_indexes.sql
 *   2. Run this:      node tests/explain_indexes.js
 *
 * What to look for in the output:
 *   - "key" column should NOT be NULL — this means an index is being used
 *   - "possible_keys" shows which indexes MySQL considered
 *   - "rows" shows estimated rows scanned — lower is better
 */

require('dotenv').config();

const mysql = require('mysql2/promise');

async function main() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT, 10) || 3306,
  });

  const queries = [
    {
      label: 'BEFORE INDEXES — Show current indexes on rets_property',
      sql: 'SHOW INDEXES FROM rets_property',
      params: [],
      isExplain: false,
    },
    {
      label: 'Query 1 — City filter only (should use idx_city or composite)',
      sql: `EXPLAIN SELECT * FROM rets_property WHERE L_City = ?`,
      params: ['Portland'],
      isExplain: true,
    },
    {
      label: 'Query 2 — Zipcode filter (should use idx_zip)',
      sql: `EXPLAIN SELECT * FROM rets_property WHERE L_Zip = ?`,
      params: ['97201'],
      isExplain: true,
    },
    {
      label: 'Query 3 — Price range (should use idx_price)',
      sql: `EXPLAIN SELECT * FROM rets_property WHERE L_SystemPrice >= ? AND L_SystemPrice <= ?`,
      params: [300000, 500000],
      isExplain: true,
    },
    {
      label: 'Query 4 — State + City + Price range (should use idx_state_city_price)',
      sql: `EXPLAIN SELECT * FROM rets_property WHERE L_State = ? AND L_City = ? AND L_SystemPrice >= ?`,
      params: ['Oregon', 'Portland', 300000],
      isExplain: true,
    },
    {
      label: 'Query 5 — State + City + Beds + Baths + Price (should use idx_state_city_beds_baths_price)',
      sql: `EXPLAIN SELECT * FROM rets_property
            WHERE L_State = ? AND L_City = ? AND L_Keyword2 >= ? AND LM_Dec_3 >= ? AND L_SystemPrice >= ?`,
      params: ['Oregon', 'Portland', 3, 2, 300000],
      isExplain: true,
    },
    {
      label: 'Query 6 — Full filter query (as the API would run it)',
      sql: `EXPLAIN SELECT
              L_ListingID AS listingId,
              L_SystemPrice AS listPrice,
              L_Address AS address,
              L_City AS city,
              L_State AS state,
              L_Zip AS zipCode,
              L_Keyword2 AS beds,
              LM_Dec_3 AS baths,
              LM_Int2_3 AS sqft
            FROM rets_property
            WHERE L_City IS NOT NULL AND L_City != ''
              AND L_State IS NOT NULL AND L_State != ''
              AND L_Zip IS NOT NULL AND L_Zip != '' AND L_Zip REGEXP '^[0-9]{5}$'
              AND L_SystemPrice IS NOT NULL AND L_SystemPrice >= 0
              AND L_Keyword2 IS NOT NULL AND L_Keyword2 >= 0
              AND LM_Dec_3 IS NOT NULL AND LM_Dec_3 >= 0
              AND L_City REGEXP '^[A-Za-z ]+$'
              AND L_State REGEXP '^[A-Za-z ]+$'
              AND LOWER(L_City) = LOWER(?)
              AND L_SystemPrice >= ?
              AND L_SystemPrice <= ?
              AND L_Keyword2 = ?
              AND LM_Dec_3 = ?
            ORDER BY L_SystemPrice DESC
            LIMIT ? OFFSET ?`,
      params: ['Portland', 300000, 500000, 3, 2, 20, 0],
      isExplain: true,
    },
  ];

  console.log('='.repeat(70));
  console.log('Week 3 — EXPLAIN Index Verification');
  console.log('='.repeat(70));

  for (const q of queries) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📋 ${q.label}`);
    console.log(`   SQL: ${q.sql.replace(/\s+/g, ' ').trim()}`);
    if (q.params.length > 0) {
      console.log(`   Params: [${q.params.join(', ')}]`);
    }
    console.log('─'.repeat(70));

    try {
      const [rows] = await pool.query(q.sql, q.params);

      if (q.isExplain) {
        for (const row of rows) {
          const keyUsed = row.key || 'NULL ⚠️  NO INDEX USED';
          const possibleKeys = row.possible_keys || 'None';
          console.log(`   type: ${row.type}`);
          console.log(`   possible_keys: ${possibleKeys}`);
          console.log(`   key: ${keyUsed}`);
          console.log(`   rows: ${row.rows}`);
          console.log(`   Extra: ${row.Extra || ''}`);
        }
      } else {
        // SHOW INDEXES — print as a table
        console.log(`   Found ${rows.length} indexes:`);
        for (const row of rows) {
          console.log(`   - ${row.Key_name} (${row.Column_name}, Seq: ${row.Seq_in_index})`);
        }
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err.message}`);
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('Done. Check that "key" is NOT NULL for EXPLAIN queries.');
  console.log('='.repeat(70));

  await pool.end();
}

main().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
