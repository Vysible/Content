export function htmlToGutenberg(html: string): string {
  // Wrap bare content in a core/freeform block which accepts raw HTML
  // This is the safest approach — WP will parse it on the server
  return `<!-- wp:html -->\n${html}\n<!-- /wp:html -->`
}

export function buildPostPayload(title: string, html: string, categories: number[] = []): object {
  return {
    title,
    content: htmlToGutenberg(html),
    status: 'draft',
    categories,
  }
}
