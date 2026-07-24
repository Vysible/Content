import { describe, it, expect } from 'vitest'
import { lintNewsletterHtml } from '@/lib/newsletter/esp-lint'

const CLEAN_HTML = `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body>
<table width="600"><tr><td>
  <img src="https://example.com/foto.jpg" alt="Praxisfoto" width="600">
  <a href="{{unsubscribe_link}}">Newsletter abbestellen</a>
</td></tr></table>
</body></html>`

describe('lintNewsletterHtml', () => {
  it('meldet keine Probleme bei sauberem HTML', () => {
    expect(lintNewsletterHtml(CLEAN_HTML)).toEqual([])
  })

  it('meldet position:absolute ohne MSO-Fallback', () => {
    const html = `<div style="position:absolute;top:0;">Text</div>`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.message.includes('position:absolute'))).toBe(true)
  })

  it('meldet position:absolute NICHT, wenn MSO-Fallback vorhanden ist', () => {
    const html = `<div style="position:absolute;top:0;">Text</div><!--[if mso]><img src="x.jpg"><![endif]-->`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.message.includes('position:absolute'))).toBe(false)
  })

  it('meldet Base64-Bilder als Fehler', () => {
    const html = `<img src="data:image/png;base64,abc123">`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Base64'))).toBe(true)
  })

  it('meldet fehlenden Abmelde-Link', () => {
    const html = `<table width="600"><tr><td>Herzliche Grüße vom Praxisteam</td></tr></table>`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.severity === 'error' && i.message.includes('Abmelde'))).toBe(true)
  })

  it('meldet fehlendes viewport-Meta', () => {
    const html = `<html><body><a href="#">abmelden</a></body></html>`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.message.includes('viewport'))).toBe(true)
  })

  it('meldet Bilder ohne alt-Text', () => {
    const html = `<img src="foto.jpg"><a href="#">abmelden</a>`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.message.includes('alt-Text'))).toBe(true)
  })

  it('meldet zu große Breite', () => {
    const html = `<table width="800"><a href="#">abmelden</a></table>`
    const issues = lintNewsletterHtml(html)
    expect(issues.some((i) => i.message.includes('800px'))).toBe(true)
  })

  it('klicktipp-block-editor: erlaubt table/tr/td/span/strong/img/a/br', () => {
    const html = `<table><tr><td><span><strong>Text</strong></span><img src="x.jpg" alt="x"><a href="#">abmelden</a><br></td></tr></table>`
    const issues = lintNewsletterHtml(html, 'klicktipp-block-editor')
    expect(issues.some((i) => i.message.includes('erlaubt nur'))).toBe(false)
  })

  it('klicktipp-block-editor: meldet verbotene Tags wie <div> und <p>', () => {
    const html = `<div><p>Text</p></div><a href="#">abmelden</a>`
    const issues = lintNewsletterHtml(html, 'klicktipp-block-editor')
    const tagIssue = issues.find((i) => i.message.includes('erlaubt nur'))
    expect(tagIssue).toBeDefined()
    expect(tagIssue?.message).toContain('div')
    expect(tagIssue?.message).toContain('p')
  })

  it('klicktipp-api: verbotene Blockeditor-Tags werden NICHT gemeldet', () => {
    const html = `<div><p>Text</p></div><a href="#">abmelden</a>`
    const issues = lintNewsletterHtml(html, 'klicktipp-api')
    expect(issues.some((i) => i.message.includes('erlaubt nur'))).toBe(false)
  })
})
