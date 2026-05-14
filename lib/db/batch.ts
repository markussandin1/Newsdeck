/**
 * Batch-insert-helper (P2-1 steg 2).
 *
 * Bygger parameteriserade multi-row VALUES-uttryck för effektiv massinsättning.
 * Delar upp i chunks som håller sig under PostgreSQL:s 65 535-parameter-limit.
 */

export interface BatchInsertResult {
  text: string
  values: unknown[]
}

/**
 * Build a single parameterised multi-row VALUES clause.
 *
 * @param rows        - Array of value arrays. Each inner array is one row.
 * @param chunkSize   - Max rows per query chunk (default 1 000, keeps us well
 *                      under PostgreSQL's 65 535 parameter limit).
 * @returns Array of {text, values} objects, one per chunk. Usually just one.
 *
 * @example
 *   const chunks = buildBatchInsert([
 *     ['col1', 'dbId1', '{}', now],
 *     ['col2', 'dbId2', '{}', now],
 *   ])
 *   for (const { text, values } of chunks) {
 *     await client.query(text, values)
 *   }
 */
export function buildBatchInsert(
  rows: unknown[][],
  chunkSize = 1_000,
): BatchInsertResult[] {
  if (rows.length === 0) return []

  const cols = rows[0].length
  const chunks: BatchInsertResult[] = []

  for (let start = 0; start < rows.length; start += chunkSize) {
    const chunk = rows.slice(start, start + chunkSize)
    const valuePlaceholders = chunk
      .map((_, rowIdx) =>
        `(${Array.from({ length: cols }, (_, colIdx) => `$${rowIdx * cols + colIdx + 1}`).join(', ')})`,
      )
      .join(', ')
    const values = chunk.flat()
    chunks.push({ text: valuePlaceholders, values })
  }

  return chunks
}
