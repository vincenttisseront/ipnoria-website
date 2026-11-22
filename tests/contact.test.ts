import { describe, expect, it } from 'vitest'
import { contactSchema, invalidFields } from '#shared/contact'

const valid = {
  name: 'Alice Martin',
  email: 'Alice@Example.org',
  company: '',
  topic: 'demo',
  message: 'Bonjour, nous voulons remplacer nos serveurs DHCP.',
  consent: true,
  locale: 'fr',
  website: '',
  startedAt: 1_700_000_000_000,
}

describe('schéma du formulaire de contact', () => {
  it('accepte un message valide et normalise l\'e-mail', () => {
    const r = contactSchema.parse(valid)
    expect(r.email).toBe('alice@example.org')
    expect(r.company).toBe('')
  })

  it('garde les caractères « < > » dans le message (texte brut, jamais rendu en HTML)', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'si a < b alors <rien>' }).success).toBe(true)
  })

  it.each([
    ['name', { name: 'A' }],
    ['name', { name: 'Eve\r\nBcc: x@y.z' }],
    ['email', { email: 'pas-un-email' }],
    ['email', { email: 'a@b.fr\nBcc: c@d.fr' }],
    ['company', { company: 'x'.repeat(121) }],
    ['topic', { topic: 'spam' }],
    ['message', { message: 'court' }],
    ['message', { message: 'x'.repeat(5001) }],
    ['message', { message: 'caractère de contrôle \u0007 interdit' }],
    ['consent', { consent: false }],
  ])('refuse un champ %s invalide', (field, patch) => {
    const r = contactSchema.safeParse({ ...valid, ...patch })
    expect(r.success).toBe(false)
    if (!r.success) expect(invalidFields(r.error)).toContain(field)
  })

  it('ne révèle jamais les champs pièges dans les erreurs', () => {
    const r = contactSchema.safeParse({ ...valid, website: 'http://spam', name: '' })
    expect(r.success).toBe(false)
    if (!r.success) expect(invalidFields(r.error)).toEqual(['name'])
  })

  it('accepte le retour à la ligne dans le message', () => {
    expect(contactSchema.safeParse({ ...valid, message: 'ligne 1\nligne 2\r\nligne 3' }).success).toBe(true)
  })
})
