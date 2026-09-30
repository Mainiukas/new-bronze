import type { ReactNode } from 'react'

/**
 * A small Markdown renderer for our own documents (docs/RULES.md): headings,
 * paragraphs, bullet and numbered lists (one level, continuation lines
 * joined), tables, **bold** and `code`. Text only: no HTML is ever passed
 * through.
 */
export function Markdown({ source }: { source: string }) {
  return <div className="legal-prose flex flex-col gap-3 leading-relaxed text-parchment-200">{blocks(source)}</div>
}

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let last = 0
  let i = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(text.slice(last, match.index))
    const token = match[0]
    out.push(
      token.startsWith('**') ? (
        <strong key={`${key}-${i++}`} className="text-parchment-50">
          {token.slice(2, -2)}
        </strong>
      ) : (
        <code key={`${key}-${i++}`} className="rounded bg-soot-950/70 px-1 text-[0.9em] text-brass-200">
          {token.slice(1, -1)}
        </code>
      ),
    )
    last = match.index + token.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

function blocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: ReactNode[] = []
  let i = 0
  let key = 0
  const k = () => `md-${key++}`
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i++
      continue
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const text = inline(heading[2], k())
      out.push(
        level <= 1 ? (
          <h2 key={k()} className="font-display text-2xl font-bold tracking-[0.06em] text-parchment-50">
            {text}
          </h2>
        ) : level === 2 ? (
          <h3 key={k()} className="mt-3 font-display text-xl font-bold tracking-[0.06em] text-brass-200">
            {text}
          </h3>
        ) : (
          <h4 key={k()} className="mt-1 font-display text-base font-bold tracking-[0.06em] text-parchment-100">
            {text}
          </h4>
        ),
      )
      i++
      continue
    }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c))) rows.push(cells)
        i++
      }
      const [head, ...body] = rows
      out.push(
        <div key={k()} className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {head.map((c, j) => (
                  <th key={j} className="border-b border-bronze-500/40 px-2 py-1 text-left font-semibold text-parchment-100">
                    {inline(c, k())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r}>
                  {row.map((c, j) => (
                    <td key={j} className="border-b border-bronze-500/15 px-2 py-1">
                      {inline(c, k())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }
    const item = /^\s*(?:[-*]|\d+\.)\s+/
    if (item.test(line)) {
      const ordered = /^\s*\d+\./.test(line)
      const items: string[] = []
      while (i < lines.length && lines[i].trim() && (item.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
        if (item.test(lines[i])) items.push(lines[i].replace(item, ''))
        else items[items.length - 1] += ` ${lines[i].trim()}`
        i++
      }
      const List = ordered ? 'ol' : 'ul'
      out.push(
        <List key={k()} className={`flex flex-col gap-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'} marker:text-bronze-300`}>
          {items.map((text, j) => (
            <li key={j}>{inline(text, k())}</li>
          ))}
        </List>,
      )
      continue
    }
    const para: string[] = []
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*\||\s*(?:[-*]|\d+\.)\s)/.test(lines[i])) para.push(lines[i++].trim())
    out.push(<p key={k()}>{inline(para.join(' '), k())}</p>)
  }
  return out
}
