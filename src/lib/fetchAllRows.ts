/**
 * Lê todas as páginas de uma consulta do Supabase. Cada resposta é limitada a
 * 1.000 linhas pelo servidor; sem paginar, o excedente é cortado em silêncio.
 * `buildQuery` deve montar a consulta do zero a cada chamada (com .order estável).
 *
 * As páginas são pedidas em lotes paralelos (`paralelo`, padrão 4): uma tabela
 * com 8 mil linhas sai em 2 idas ao servidor em vez de 8 em fila.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllRows<T>(buildQuery: () => any, pageSize = 1000, paralelo = 4): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;
  while (true) {
    const lote = await Promise.all(
      Array.from({ length: paralelo }, (_, i) => {
        const ini = from + i * pageSize;
        return buildQuery().range(ini, ini + pageSize - 1) as Promise<{ data: T[] | null; error: unknown }>;
      }),
    );
    for (const { data, error } of lote) {
      if (error) throw error;
      if (data?.length) rows.push(...data);
      // Página incompleta (ou vazia) = fim dos dados
      if (!data || data.length < pageSize) return rows;
    }
    from += paralelo * pageSize;
  }
}

/** Executa tarefas assíncronas com no máximo `limite` ao mesmo tempo, mantendo a ordem. */
export async function emParalelo<T, R>(itens: T[], limite: number, tarefa: (item: T) => Promise<R>): Promise<R[]> {
  const saida: R[] = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const i = proximo++;
      saida[i] = await tarefa(itens[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limite, itens.length) }, trabalhador));
  return saida;
}
