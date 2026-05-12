import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

interface PromptTemplate {
  system: string
  user: string
}

/** Lädt ein YAML-Prompt aus /prompts/<name>.yaml und ersetzt {{variablen}} */
export function loadPrompt(name: string, vars: Record<string, string>): { system: string; user: string } {
  const filePath = path.join(process.cwd(), 'prompts', `${name}.yaml`)
  const raw = fs.readFileSync(filePath, 'utf-8')
  const template = yaml.load(raw) as PromptTemplate

  function replace(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '')
  }

  return {
    system: replace(template.system),
    user: replace(template.user),
  }
}
