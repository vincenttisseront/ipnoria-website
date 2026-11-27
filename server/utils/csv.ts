/** CSV avec BOM, pour qu'un tableur ouvre les accents. Une cellule qui commence par une formule est neutralisée. */
export function toCsv(rows: Array<Array<string | number | null | undefined>>): string {
  const cell = (value: string | number | null | undefined) => {
    const raw = value == null ? '' : String(value)
    const s = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw
    return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  return `\uFEFF${rows.map(row => row.map(cell).join(',')).join('\r\n')}\r\n`
}
