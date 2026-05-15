export function blogToGutenbergHtml(blogMarkdown: string, hwgDisclaimer: string): string {
  const blocks: string[] = []

  const lines = blogMarkdown.split('\n')
  let buffer = ''
  let listBuffer: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed.startsWith('# ')) {
      // H1 → used as Post-Title, NOT in content body
      continue
    } else if (trimmed.startsWith('## ')) {
      if (listBuffer.length) { blocks.push(listBlock(listBuffer)); listBuffer = [] }
      if (buffer) { blocks.push(paragraphBlock(buffer.trim())); buffer = '' }
      blocks.push(headingBlock(trimmed.slice(3), 2))
    } else if (trimmed.startsWith('### ')) {
      if (listBuffer.length) { blocks.push(listBlock(listBuffer)); listBuffer = [] }
      if (buffer) { blocks.push(paragraphBlock(buffer.trim())); buffer = '' }
      blocks.push(headingBlock(trimmed.slice(4), 3))
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      if (buffer) { blocks.push(paragraphBlock(buffer.trim())); buffer = '' }
      listBuffer.push(trimmed.slice(2))
    } else if (trimmed === '') {
      if (listBuffer.length) { blocks.push(listBlock(listBuffer)); listBuffer = [] }
      if (buffer.trim()) { blocks.push(paragraphBlock(buffer.trim())); buffer = '' }
    } else {
      if (listBuffer.length) { blocks.push(listBlock(listBuffer)); listBuffer = [] }
      buffer += (buffer ? ' ' : '') + trimmed
    }
  }
  if (listBuffer.length) blocks.push(listBlock(listBuffer))
  if (buffer.trim()) blocks.push(paragraphBlock(buffer.trim()))

  if (hwgDisclaimer) {
    blocks.push(disclaimerBlock(hwgDisclaimer))
  }

  return blocks.join('\n\n')
}

function paragraphBlock(text: string): string {
  return `<!-- wp:paragraph -->\n<p>${escapeHtml(text)}</p>\n<!-- /wp:paragraph -->`
}

function headingBlock(text: string, level: 2 | 3): string {
  return `<!-- wp:heading {"level":${level}} -->\n<h${level}>${escapeHtml(text)}</h${level}>\n<!-- /wp:heading -->`
}

function listBlock(items: string[]): string {
  const lis = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')
  return `<!-- wp:list -->\n<ul>${lis}</ul>\n<!-- /wp:list -->`
}

function disclaimerBlock(text: string): string {
  return `<!-- wp:paragraph {"className":"disclaimer"} -->\n<p class="disclaimer">${escapeHtml(text)}</p>\n<!-- /wp:paragraph -->`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function htmlToGutenbergFreeform(html: string, hwgDisclaimer: string): string {
  const blocks: string[] = []
  blocks.push(`<!-- wp:html -->\n${html}\n<!-- /wp:html -->`)
  if (hwgDisclaimer) {
    blocks.push(disclaimerBlock(hwgDisclaimer))
  }
  return blocks.join('\n\n')
}

export function extractH1Title(blogMarkdown: string): string {
  const match = /^# (.+)$/m.exec(blogMarkdown)
  return match?.[1]?.trim() ?? ''
}

export function extractTitleFromHtml(html: string): string {
  const match = /<h1[^>]*>([^<]+)<\/h1>/i.exec(html)
  return match?.[1]?.trim() ?? ''
}
