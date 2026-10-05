/**
 * Lê todas as páginas de uma consulta do Supabase. Cada resposta é limitada a
 * 1.000 linhas pelo servidor; sem paginar, o excedente é cortado em silêncio.
 * `buildQuery` deve montar a consulta do zero a cada chamada (com .order estável).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllRows<T>(buildQuery: () => any, pageSize = 1000): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await buildQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as T[]));
    // Avança pelo número real de linhas: o servidor pode limitar abaixo de pageSize
    from += data.length;
  }
  return rows;
}
