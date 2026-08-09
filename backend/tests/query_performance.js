/**
 * ============================================================================
 * Task: Week 9 Part B — Performance Optimization: Query EXPLAIN & Analysis
 * ============================================================================
 *
 * This script runs detailed EXPLAIN, EXPLAIN ANALYZE (MySQL 8), and execution
 * timing benchmarks on the application's most complex database queries.
 *
 * It interprets every column in the EXPLAIN output and generates actionable
 * diagnostic reports to evaluate query optimization and indexing strategy.
 *
 * Run with:
 *   node tests/query_performance.js
 *   (or from backend: npm run perf)
 * ============================================================================
 */

require('dotenv').config();
const mysql = require('mysql2/promise');

// ─────────────────────────────────────────────────────────────────────────────
// EXPLAIN COLUMN REFERENCE & INTERPRETATION GUIDE
// ─────────────────────────────────────────────────────────────────────────────
const EXPLAIN_COLUMN_DOCS = {
  id: {
    name: 'Query ID (id)',
    description: 'The sequential identifier of the SELECT query within the overall statement.',
    interpretation:
      'Queries with subqueries or derived tables will show multiple IDs. Lower numbers or top-level rows represent the outer query; higher numbers represent nested subqueries.',
  },
  select_type: {
    name: 'Select Type (select_type)',
    description: 'The classification of the SELECT statement.',
    interpretation:
      'Common types:\n' +
      '  - SIMPLE: Query without subqueries or UNIONs.\n' +
      '  - PRIMARY: The outermost query in a complex statement with subqueries/UNIONs.\n' +
      '  - DERIVED: A derived table (subquery in the FROM clause).\n' +
      '  - SUBQUERY: Subquery in SELECT or WHERE clause.\n' +
      '  - UNION: The second or later SELECT in a UNION statement.',
  },
  table: {
    name: 'Table (table)',
    description: 'The table or derived alias to which the execution row refers.',
    interpretation:
      'Shows which physical table (e.g. rets_property, rets_openhouse) or intermediate result (<derived2>) is being read.',
  },
  partitions: {
    name: 'Partitions (partitions)',
    description: 'Partitions matched by the query if the table is partitioned.',
    interpretation: 'NULL or empty if partitioning is not configured.',
  },
  type: {
    name: 'Join / Access Type (type)',
    description: 'How MySQL accesses data in the table. Ranked from FASTEST (best) to SLOWEST (worst):',
    interpretation:
      '  1. system / const : 0 or 1 row lookup (primary key / unique index match on constant).\n' +
      '  2. eq_ref         : 1 row retrieved per row from preceding table (primary key/unique join).\n' +
      '  3. ref            : Non-unique index match (multiple matching rows, very efficient).\n' +
      '  4. fulltext       : Fulltext index scan.\n' +
      '  5. ref_or_null    : Like ref, but searches for NULL values as well.\n' +
      '  6. index_merge    : Merges multiple single-column index scans.\n' +
      '  7. range          : Index range scan (used for <, >, BETWEEN, IN, LIKE prefixes).\n' +
      '  8. index          : Full index scan (scans entire index tree; better than ALL if covering).\n' +
      '  9. ALL            : Full table scan (reads every data row on disk; POOR performance).',
  },
  possible_keys: {
    name: 'Possible Keys (possible_keys)',
    description: 'Candidate indexes MySQL considered when evaluating how to find rows in this table.',
    interpretation:
      'If NULL or empty, no suitable index was found. If populated, MySQL evaluated these indexes during cost-based optimization.',
  },
  key: {
    name: 'Chosen Index (key)',
    description: 'The actual index chosen by the MySQL query optimizer.',
    interpretation:
      '  - If a valid index name appears (e.g. idx_city, idx_price): MySQL is utilizing an index.\n' +
      '  - If NULL: No index was used — MySQL fell back to a full table scan (type: ALL).',
  },
  key_len: {
    name: 'Key Length in Bytes (key_len)',
    description: 'The number of bytes of the index key that MySQL actually used.',
    interpretation:
      'For composite indexes, key_len shows how many columns of the index were matched.\n' +
      'Shorter lengths indicate fewer prefix columns were used; longer lengths mean more index columns matched.',
  },
  ref: {
    name: 'Key Reference (ref)',
    description: 'Shows which columns or constants are compared to the index named in the key column.',
    interpretation:
      'Examples: "const" for literal values in WHERE, or "db.table.column" for join columns.',
  },
  rows: {
    name: 'Estimated Rows Examined (rows)',
    description: 'The estimated number of rows MySQL expects to scan to execute this step.',
    interpretation:
      'Lower values are significantly better. In large tables, reducing rows from 30,000+ to <50 drastically cuts disk I/O and CPU time.',
  },
  filtered: {
    name: 'Filtered Percentage (filtered)',
    description: 'Estimated percentage of examined rows that will satisfy remaining WHERE conditions.',
    interpretation:
      'A value of 100.00% means every row read matched the condition (optimal).\n' +
      'A low percentage (e.g. 10.00%) means MySQL examined 10x more rows than actually matched, indicating an index on additional filter columns could help.',
  },
  Extra: {
    name: 'Extra Optimization Information (Extra)',
    description: 'Additional notes on how MySQL resolves the query.',
    interpretation:
      'Key indicators:\n' +
      '  - Using index: Covering index used (retrieved data directly from index without reading data table rows).\n' +
      '  - Using where: WHERE conditions evaluated on rows after reading from storage engine.\n' +
      '  - Using index condition (ICP): Index Condition Pushdown pushes WHERE evaluation down into storage engine.\n' +
      '  - Using MRR: Multi-Range Read optimization batches random disk lookups into sequential reads.\n' +
      '  - Using filesort: MySQL needs an extra sorting pass (ORDER BY was not satisfied by the index scan order).\n' +
      '  - Using temporary: MySQL created an internal memory/disk temporary table to hold intermediate results.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// QUERY DEFINITIONS — FROM SIMPLE TO MOST COMPLEX
// ─────────────────────────────────────────────────────────────────────────────
const TEST_QUERIES = [
  {
    id: 'Q1',
    category: 'Single Filter Search',
    title: 'City Filter Only',
    description: 'Basic single-column search on L_City',
    sql: `SELECT L_ListingID, L_DisplayId, L_City, L_State, L_SystemPrice
          FROM rets_property
          WHERE L_City = ?
          LIMIT 20`,
    params: ['Portland'],
  },
  {
    id: 'Q2',
    category: 'Range Filter Search',
    title: 'Price Range Filter',
    description: 'Numeric range search on L_SystemPrice with inequality operators',
    sql: `SELECT L_ListingID, L_DisplayId, L_City, L_State, L_SystemPrice
          FROM rets_property
          WHERE L_SystemPrice >= ? AND L_SystemPrice <= ?
          LIMIT 20`,
    params: [300000, 600000],
  },
  {
    id: 'Q3',
    category: 'Composite Filter Search',
    title: 'Location + Price + Bedrooms + Bathrooms Filter',
    description: 'Multi-column filter combining State, City, Beds, Baths, and Price range',
    sql: `SELECT L_ListingID, L_DisplayId, L_City, L_State, L_SystemPrice, L_Keyword2 AS beds, LM_Dec_3 AS baths
          FROM rets_property
          WHERE L_State = ?
            AND L_City = ?
            AND L_Keyword2 >= ?
            AND LM_Dec_3 >= ?
            AND L_SystemPrice >= ?
            AND L_SystemPrice <= ?
          ORDER BY L_SystemPrice DESC
          LIMIT 20`,
    params: ['Oregon', 'Portland', 3, 2, 300000, 750000],
  },
  {
    id: 'Q4',
    category: 'Production Endpoint Query (Properties Search - Optimized)',
    title: 'Full Production GET /api/properties Search with EXISTS & Direct Matching',
    description:
      'The optimized endpoint query: normalized exact filter matching (enabling idx_city & idx_city_price), ' +
      'ORDER BY price DESC, LIMIT/OFFSET pagination, and a lightweight correlated EXISTS subquery for hasOpenHouse.',
    sql: `SELECT
            p.L_ListingID   AS listingId,
            p.L_DisplayId   AS propertyId,
            p.L_SystemPrice AS listPrice,
            p.L_Address     AS address,
            p.L_City        AS city,
            p.L_State       AS state,
            p.L_Zip         AS zipCode,
            p.L_Keyword2    AS beds,
            p.LM_Dec_3      AS baths,
            p.LM_Int2_3     AS sqft,
            p.L_Photos      AS photos,
            p.StandardStatus AS status,
            EXISTS (
              SELECT 1
              FROM rets_openhouse oh
              WHERE oh.L_DisplayId = p.L_DisplayId
                AND oh.OH_StartDate <= oh.OH_EndDate
                AND oh.OH_EndDate >= CURDATE()
                AND oh.OH_StartDate <= CURDATE()
            ) AS hasOpenHouse
          FROM rets_property p
          WHERE p.L_City = ?
            AND p.L_State IS NOT NULL AND p.L_State != '' AND p.L_State REGEXP '^[A-Za-z ]+$'
            AND p.L_Zip IS NOT NULL AND p.L_Zip != '' AND p.L_Zip REGEXP '^[0-9]{5}$'
            AND p.L_SystemPrice >= ?
            AND p.L_SystemPrice <= ?
            AND p.L_Keyword2 = ?
            AND p.LM_Dec_3 = ?
          ORDER BY p.L_SystemPrice DESC
          LIMIT ? OFFSET ?`,
    params: ['Portland', 300000, 750000, 3, 2, 20, 0],
  },
  {
    id: 'Q5',
    category: 'Production Endpoint Query (Properties Total Count - Optimized)',
    title: 'Full Production GET /api/properties Total Matching Count Query',
    description: 'Optimized total matching properties count for pagination with active filters.',
    sql: `SELECT COUNT(*) AS total
          FROM rets_property
          WHERE L_City = ?
            AND L_State IS NOT NULL AND L_State != '' AND L_State REGEXP '^[A-Za-z ]+$'
            AND L_Zip IS NOT NULL AND L_Zip != '' AND L_Zip REGEXP '^[0-9]{5}$'
            AND L_SystemPrice >= ?
            AND L_SystemPrice <= ?
            AND L_Keyword2 = ?
            AND LM_Dec_3 = ?`,
    params: ['Portland', 300000, 750000, 3, 2],
  },
  {
    id: 'Q6',
    category: 'Production Endpoint Query (Open Houses Search - Optimized)',
    title: 'Full Production GET /api/openhouses Join & Date Range Search',
    description:
      'Joins rets_openhouse and rets_property using idx_date_startTime_displayId, ' +
      'property price/location filters, and multi-column sorting (OpenHouseDate + OH_StartTime).',
    sql: `SELECT
            oh.L_ListingID,
            oh.L_DisplayId,
            oh.OpenHouseDate,
            oh.OH_StartDate,
            oh.OH_EndDate,
            oh.OH_StartTime   AS startTime,
            oh.OH_EndTime     AS endTime,
            oh.all_data,
            p.L_SystemPrice   AS listPrice,
            p.L_Address       AS address,
            p.L_City          AS city,
            p.L_State         AS state,
            p.L_Zip           AS zipCode,
            p.L_Keyword2      AS beds,
            p.LM_Dec_3        AS baths,
            p.LM_Int2_3       AS sqft,
            p.L_Photos        AS photos,
            p.StandardStatus  AS status
          FROM rets_openhouse oh
          INNER JOIN rets_property p ON oh.L_DisplayId = p.L_DisplayId
          WHERE oh.OH_StartDate <= oh.OH_EndDate
            AND oh.OpenHouseDate >= ?
            AND oh.OpenHouseDate <= ?
            AND p.L_City = ?
            AND p.L_SystemPrice >= ?
            AND p.L_SystemPrice <= ?
          ORDER BY oh.OpenHouseDate ASC, oh.OH_StartTime ASC
          LIMIT ? OFFSET ?`,
    params: ['2024-01-01', '2026-12-31', 'Portland', 200000, 800000, 20, 0],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE BENCHMARK HELPER
// ─────────────────────────────────────────────────────────────────────────────
async function benchmarkQuery(pool, sql, params, iterations = 5) {
  const timings = [];
  let rowCount = 0;

  for (let i = 0; i < iterations; i++) {
    const start = process.hrtime.bigint();
    const [rows] = await pool.query(sql, params);
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000;
    timings.push(durationMs);
    rowCount = rows.length;
  }

  const min = Math.min(...timings);
  const max = Math.max(...timings);
  const avg = timings.reduce((a, b) => a + b, 0) / timings.length;

  return { min, max, avg, rowCount, iterations };
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATED DIAGNOSTIC INTERPRETER
// ─────────────────────────────────────────────────────────────────────────────
function analyzeExplainRows(explainRows) {
  const observations = [];
  const recommendations = [];

  let fullTableScan = false;
  let filesortUsed = false;
  let tempTableUsed = false;
  let totalRowsExamined = 0;

  for (const row of explainRows) {
    totalRowsExamined += Number(row.rows) || 0;

    if (row.type === 'ALL') {
      fullTableScan = true;
      observations.push(`⚠️  [${row.table}] Full Table Scan (type: ALL) — examining ~${row.rows} rows without an index.`);
    } else if (row.type === 'range') {
      observations.push(`⚡ [${row.table}] Index Range Scan on [${row.key}] (type: range) — examining ~${row.rows} rows.`);
    } else if (row.type === 'ref' || row.type === 'eq_ref') {
      observations.push(`✅ [${row.table}] Indexed Reference Scan on [${row.key}] (type: ${row.type}) — highly targeted (~${row.rows} rows).`);
    } else if (row.type === 'index') {
      observations.push(`ℹ️  [${row.table}] Full Index Scan (type: index) on [${row.key}].`);
    }

    if (row.Extra && row.Extra.includes('Using filesort')) {
      filesortUsed = true;
      observations.push(`⚠️  [${row.table}] Using filesort — MySQL performs an in-memory or on-disk sort pass because the index order didn't match the ORDER BY clause.`);
    }

    if (row.Extra && row.Extra.includes('Using temporary')) {
      tempTableUsed = true;
      observations.push(`⚠️  [${row.table}] Using temporary — an internal temporary table is created to process aggregations or joins.`);
    }

    if (row.Extra && row.Extra.includes('Using index condition')) {
      observations.push(`⚡ [${row.table}] Using index condition (ICP) — pushed filter evaluation down to InnoDB storage engine.`);
    }

    if (row.Extra && row.Extra.includes('Using MRR')) {
      observations.push(`⚡ [${row.table}] Using MRR (Multi-Range Read) — optimizes random disk I/O into sequential batches.`);
    }
  }

  if (fullTableScan) {
    recommendations.push('Add an index covering the filtered columns to eliminate full table scans.');
  }
  if (filesortUsed) {
    recommendations.push('Consider a composite index including the sort column (e.g. (filter_col, sort_col DESC)) to achieve index-ordered retrieval without filesort.');
  }
  if (!fullTableScan && !filesortUsed && !tempTableUsed) {
    recommendations.push('Query execution plan is well-optimized with efficient index utilization.');
  }

  return { observations, recommendations, totalRowsExamined };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXECUTION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║       IDXEXCHANGE — DATABASE QUERY PERFORMANCE & EXPLAIN ANALYSIS         ║');
  console.log('║               Task: Week 9 Part B — Performance Optimization               ║');
  console.log('╚' + '═'.repeat(78) + '╝\n');

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'rootpassword',
    database: process.env.DB_NAME || 'rets',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
  });

  try {
    // 1. Connection check & database version
    const [versionRows] = await pool.query('SELECT VERSION() AS version, DATABASE() as db');
    const dbVersion = versionRows[0].version;
    const dbName = versionRows[0].db;
    console.log(`📡 Connected to MySQL Server: ${dbVersion} | Database: "${dbName}"\n`);

    // 2. Display EXPLAIN column reference guide
    console.log('📖 ' + '─'.repeat(76));
    console.log('📖 EXPLAIN OUTPUT COLUMNS — REFERENCE GUIDE & INTERPRETATION');
    console.log('📖 ' + '─'.repeat(76));
    for (const [col, info] of Object.entries(EXPLAIN_COLUMN_DOCS)) {
      console.log(`\n  🔹 \x1b[1m\x1b[36m${info.name}\x1b[0m`);
      console.log(`     Description:    ${info.description}`);
      console.log(`     Interpretation: ${info.interpretation.replace(/\n/g, '\n                     ')}`);
    }

    // 3. Inspect Current Table Indexes
    console.log('\n\n' + '═'.repeat(80));
    console.log('🔍 CURRENT ACTIVE DATABASE INDEXES');
    console.log('═'.repeat(80));

    const [propIndexes] = await pool.query('SHOW INDEXES FROM rets_property');
    console.log(`\n📌 Table: rets_property (${propIndexes.length} index keys found)`);
    const propIndexMap = {};
    for (const idx of propIndexes) {
      if (!propIndexMap[idx.Key_name]) propIndexMap[idx.Key_name] = [];
      propIndexMap[idx.Key_name].push(idx.Column_name);
    }
    for (const [name, cols] of Object.entries(propIndexMap)) {
      console.log(`   • ${name.padEnd(32)} -> (${cols.join(', ')})`);
    }

    const [ohIndexes] = await pool.query('SHOW INDEXES FROM rets_openhouse');
    console.log(`\n📌 Table: rets_openhouse (${ohIndexes.length} index keys found)`);
    const ohIndexMap = {};
    for (const idx of ohIndexes) {
      if (!ohIndexMap[idx.Key_name]) ohIndexMap[idx.Key_name] = [];
      ohIndexMap[idx.Key_name].push(idx.Column_name);
    }
    for (const [name, cols] of Object.entries(ohIndexMap)) {
      console.log(`   • ${name.padEnd(32)} -> (${cols.join(', ')})`);
    }

    // 4. Run EXPLAIN & Performance Benchmarks for each test query
    console.log('\n\n' + '═'.repeat(80));
    console.log('📊 QUERY EXPLAIN PLANS, TIMINGS & PERFORMANCE INTERPRETATION');
    console.log('═'.repeat(80));

    for (const q of TEST_QUERIES) {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`🎯 [${q.id}] ${q.title.toUpperCase()} (${q.category})`);
      console.log(`   Description: ${q.description}`);
      console.log(`   SQL Query:`);
      console.log(`     ${q.sql.replace(/\s+/g, ' ').trim()}`);
      if (q.params.length > 0) {
        console.log(`   Parameters: [${q.params.join(', ')}]`);
      }
      console.log('─'.repeat(80));

      // Run EXPLAIN
      const [explainRows] = await pool.query(`EXPLAIN ${q.sql}`, q.params);

      console.log('\n📋 EXPLAIN Execution Plan:');
      console.table(
        explainRows.map((r) => ({
          id: r.id,
          select_type: r.select_type,
          table: r.table,
          type: r.type,
          possible_keys: r.possible_keys || 'NULL',
          key: r.key || 'NULL (⚠️ NO INDEX)',
          key_len: r.key_len || 'NULL',
          ref: r.ref || 'NULL',
          rows: r.rows,
          filtered: `${r.filtered}%`,
          Extra: r.Extra || '',
        }))
      );

      // Try running EXPLAIN ANALYZE (MySQL 8 feature)
      try {
        const [analyzeRows] = await pool.query(`EXPLAIN ANALYZE ${q.sql}`, q.params);
        if (analyzeRows && analyzeRows.length > 0) {
          console.log('🌲 EXPLAIN ANALYZE (Actual Execution Tree & Iterator Timings):');
          const planText = Object.values(analyzeRows[0])[0];
          console.log(
            planText
              .split('\n')
              .map((line) => '     ' + line)
              .join('\n')
          );
        }
      } catch (err) {
        // EXPLAIN ANALYZE might not support prepared statements with LIMIT in some engine subversions
        // If not available, continue gracefully
      }

      // Benchmark actual execution timing
      const benchmark = await benchmarkQuery(pool, q.sql, q.params, 5);
      console.log('\n⏱️  Execution Latency Benchmark (5 iterations):');
      console.log(
        `     Average: \x1b[32m${benchmark.avg.toFixed(2)} ms\x1b[0m | ` +
        `Min: ${benchmark.min.toFixed(2)} ms | ` +
        `Max: ${benchmark.max.toFixed(2)} ms | ` +
        `Rows Returned: ${benchmark.rowCount}`
      );

      // Automated diagnostic interpretation
      const { observations, recommendations, totalRowsExamined } = analyzeExplainRows(explainRows);
      console.log('\n🧠 Performance Interpretation & Diagnostics:');
      console.log(`   Estimated total rows examined: ${totalRowsExamined.toLocaleString()}`);
      for (const obs of observations) {
        console.log(`   ${obs}`);
      }

      console.log('\n💡 Optimization Notes & Takeaways:');
      for (const rec of recommendations) {
        console.log(`   💡 ${rec}`);
      }
    }

    console.log('\n\n' + '═'.repeat(80));
    console.log('✅ Query Performance & EXPLAIN Analysis Completed Successfully!');
    console.log('═'.repeat(80));
  } catch (err) {
    console.error('❌ Error executing performance test:', err);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
