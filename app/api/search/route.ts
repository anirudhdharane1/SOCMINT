import { NextRequest, NextResponse } from 'next/server';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { pipeline, env } from '@xenova/transformers';

export const runtime = 'nodejs';

// Disable local model file checks — let it download/cache automatically
env.allowLocalModels = false;

// Module-level singleton for the embedding pipeline
let embedder: Awaited<ReturnType<typeof pipeline>> | null = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline('feature-extraction', 'Xenova/all-mpnet-base-v2');
  }
  return embedder;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body?.query || !body?.mode) {
    return NextResponse.json({ error: 'query and mode required' }, { status: 400 });
  }

  const { query, mode } = body as { query: string; mode: 'semantic' | 'fulltext' };
  const pool = getPool();

  if (mode === 'semantic') {
    // Embed the query
    const embed = await getEmbedder();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const output = await (embed as any)(query, { pooling: 'mean', normalize: true });
    // output.data is a Float32Array; convert to a pgvector literal string
    const vector = `[${Array.from(output.data as Float32Array).join(',')}]`;

    const result = await pool.query(
      `SELECT
         sp.post_id,
         sp.raw_content,
         sp.posted_at,
         ma.account_id,
         ma.platform_handle,
         ma.threat_status,
         1 - (sp.content_embedding <=> $1::vector) AS similarity
       FROM Social_Posts sp
       JOIN Monitored_Accounts ma ON sp.account_id = ma.account_id
       ORDER BY sp.content_embedding <=> $1::vector
       LIMIT 10`,
      [vector]
    );

    return NextResponse.json({ results: result.rows, mode: 'semantic' });
  }

  if (mode === 'fulltext') {
    const result = await pool.query(
      `SELECT
         sp.post_id,
         sp.raw_content,
         sp.posted_at,
         ma.account_id,
         ma.platform_handle,
         ma.threat_status,
         ts_rank(to_tsvector('english', sp.raw_content), plainto_tsquery('english', $1)) AS similarity
       FROM Social_Posts sp
       JOIN Monitored_Accounts ma ON sp.account_id = ma.account_id
       WHERE to_tsvector('english', sp.raw_content) @@ plainto_tsquery('english', $1)
       ORDER BY similarity DESC
       LIMIT 10`,
      [query]
    );

    return NextResponse.json({ results: result.rows, mode: 'fulltext' });
  }

  return NextResponse.json({ error: 'mode must be semantic or fulltext' }, { status: 400 });
}

