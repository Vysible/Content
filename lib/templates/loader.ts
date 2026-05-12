import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

export interface ProjectTemplate {
  name: string
  fachgebiet: string
  channels: string[]
  keywords: string[]
  positioningDocument: string
}

export function listTemplates(): Array<{ slug: string; name: string; fachgebiet: string }> {
  const dir = path.join(process.cwd(), 'templates')
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), 'utf8')
      const t = yaml.load(raw) as ProjectTemplate
      return { slug: f.replace('.yaml', ''), name: t.name, fachgebiet: t.fachgebiet }
    })
}

export function loadTemplate(slug: string): ProjectTemplate {
  const filePath = path.join(process.cwd(), 'templates', `${slug}.yaml`)
  if (!fs.existsSync(filePath)) throw new Error(`Template "${slug}" nicht gefunden`)
  const raw = fs.readFileSync(filePath, 'utf8')
  return yaml.load(raw) as ProjectTemplate
}
