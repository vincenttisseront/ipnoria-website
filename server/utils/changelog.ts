export interface ChangelogEntry {
  version: string
  title: string
  body: string
}

/** Découpe CHANGELOG.md en versions : « ## X.Y.Z — « titre » » puis le texte jusqu'à la section suivante. */
export function parseChangelog(src: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  let current: ChangelogEntry | null = null
  for (const line of src.split('\n')) {
    const m = /^##\s+(\d+\.\d+\.\d+)\s*(?:[—–-]\s*(.*))?$/.exec(line)
    if (m) {
      if (current) entries.push(current)
      current = { version: m[1]!, title: (m[2] ?? '').replace(/^[«"“]\s*|\s*[»"”]$/g, '').trim(), body: '' }
    }
    else if (current) {
      current.body += `${line}\n`
    }
  }
  if (current) entries.push(current)
  return entries.map(e => ({ ...e, body: e.body.trim() }))
}

export async function loadChangelog() {
  const [src, releases] = await Promise.all([fetchRepoFile('CHANGELOG.md'), fetchReleases()])
  const dates = new Map(releases.map(r => [r.version, r]))
  return parseChangelog(src).map(e => ({
    ...e,
    publishedAt: dates.get(e.version)?.publishedAt ?? null,
    releaseUrl: dates.get(e.version)?.url || null,
  }))
}
