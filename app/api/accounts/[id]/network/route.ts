import { NextRequest, NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j';
import { getPool } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const runtime = 'nodejs';

// GET /api/accounts/[id]/network — Neo4j shared-IP/email-domain neighbours
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<'/api/accounts/[id]/network'>
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await ctx.params;

  // Resolve the neo4j_node_ref for this account
  const pool = getPool();
  const pgResult = await pool.query(
    `SELECT neo4j_node_ref, platform_handle FROM Monitored_Accounts WHERE account_id = $1`,
    [id]
  );

  const account = pgResult.rows[0];
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  // Official/benign accounts have no Neo4j node — return empty state, not an error
  if (!account.neo4j_node_ref) {
    return NextResponse.json({ nodes: [], links: [] });
  }

  const driver = getDriver();
  const neo4jSession = driver.session();
  try {
    const result = await neo4jSession.run(
      `MATCH (a:Account {id: $nodeId})
       OPTIONAL MATCH (a)-[:USED_IP]->(ip:IP)<-[:USED_IP]-(peer:Account)
       OPTIONAL MATCH (a)-[:REGISTERED_WITH]->(ed:EmailDomain)<-[:REGISTERED_WITH]-(peer2:Account)
       WITH a,
            COLLECT(DISTINCT ip)    AS ips,
            COLLECT(DISTINCT ed)    AS emailDomains,
            COLLECT(DISTINCT peer)  AS ipPeers,
            COLLECT(DISTINCT peer2) AS emailPeers
       RETURN a, ips, emailDomains, ipPeers, emailPeers`,
      { nodeId: account.neo4j_node_ref }
    );

    if (result.records.length === 0) {
      return NextResponse.json({ nodes: [], links: [] });
    }

    const rec = result.records[0];
    const rootNode = rec.get('a');
    const ips: import('neo4j-driver').Node[]         = rec.get('ips');
    const emailDomains: import('neo4j-driver').Node[] = rec.get('emailDomains');
    const ipPeers: import('neo4j-driver').Node[]      = rec.get('ipPeers');
    const emailPeers: import('neo4j-driver').Node[]   = rec.get('emailPeers');

    const nodes: { id: string; label: string; type: 'account' | 'ip' | 'emailDomain' }[] = [];
    const links: { source: string; target: string; type: string }[] = [];
    const seen = new Set<string>();

    function addNode(nodeId: string, label: string, type: 'account' | 'ip' | 'emailDomain') {
      if (!seen.has(nodeId)) { nodes.push({ id: nodeId, label, type }); seen.add(nodeId); }
    }

    // Root account
    addNode(rootNode.properties.id, rootNode.properties.handle ?? account.platform_handle, 'account');

    // IP nodes + links
    for (const ip of ips) {
      const ipId = `ip:${ip.properties.address}`;
      addNode(ipId, ip.properties.address, 'ip');
      links.push({ source: rootNode.properties.id, target: ipId, type: 'USED_IP' });
    }

    // EmailDomain nodes + links
    for (const ed of emailDomains) {
      const edId = `ed:${ed.properties.domain}`;
      addNode(edId, ed.properties.domain, 'emailDomain');
      links.push({ source: rootNode.properties.id, target: edId, type: 'REGISTERED_WITH' });
    }

    // Peer accounts sharing IPs
    for (const peer of ipPeers) {
      if (peer.properties.id === rootNode.properties.id) continue;
      addNode(peer.properties.id, peer.properties.handle, 'account');
      // Find which IPs they share
      for (const ip of ips) {
        const ipId = `ip:${ip.properties.address}`;
        links.push({ source: peer.properties.id, target: ipId, type: 'USED_IP' });
      }
    }

    // Peer accounts sharing email domains
    for (const peer of emailPeers) {
      if (peer.properties.id === rootNode.properties.id) continue;
      addNode(peer.properties.id, peer.properties.handle, 'account');
      for (const ed of emailDomains) {
        const edId = `ed:${ed.properties.domain}`;
        links.push({ source: peer.properties.id, target: edId, type: 'REGISTERED_WITH' });
      }
    }

    return NextResponse.json({ nodes, links });
  } finally {
    await neo4jSession.close();
  }
}

