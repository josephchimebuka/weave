import { source } from '@/lib/source';

// Serves /llms.txt — the llms.txt standard (https://llmstxt.org): a short
// site summary plus a flat list of every doc page with its description, so an
// LLM can discover the whole surface in one fetch. Generated from the Fumadocs
// source, so it stays in sync with the content automatically.
export function GET(request: Request) {
  const { origin } = new URL(request.url);

  // Order by the sidebar/meta.json order (Introduction first) rather than the
  // alphabetical order getPages() returns. Walk the page tree, then append any
  // stragglers not present in it.
  const pages = source.getPages();
  const byUrl = new Map(pages.map((p) => [p.url, p]));
  const ordered: typeof pages = [];
  const seen = new Set<string>();
  const walk = (nodes: any[] = []) => {
    for (const node of nodes) {
      const url = node?.type === 'folder' ? node.index?.url : node?.url;
      if (url && byUrl.has(url) && !seen.has(url)) {
        ordered.push(byUrl.get(url)!);
        seen.add(url);
      }
      if (node?.type === 'folder') walk(node.children);
    }
  };
  walk(source.pageTree.children as any[]);
  for (const p of pages) if (!seen.has(p.url)) ordered.push(p);

  const links = ordered
    .map((p) => `- [${p.data.title}](${origin}${p.url}): ${p.data.description ?? ''}`)
    .join('\n');

  const body = `# Weave

> Universal crypto ↔ fiat checkout for merchants. An end-user pays from any supported chain or token; the merchant receives funds in their chosen corridor — fiat (e.g. NGN) to a bank account, or crypto (e.g. USDC on Base) to a wallet. Integrate with a drop-in widget, a REST API, or a hosted checkout redirect.

Canonical asset identifiers are used everywhere: \`fiat:<CCY>\` or \`crypto:<CHAIN>:<TOKEN>\` (chain and token uppercase). Authentication uses a publishable key (\`pk_live_…\` / \`pk_test_…\`, browser-safe) or a secret key (\`sk_live_…\` / \`sk_test_…\`, server-only). Anything with \`_test_\` runs in sandbox — real flows, no real funds.

## Documentation

${links}
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
