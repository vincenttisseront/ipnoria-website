// E-mails des rendez-vous : confirmation, annulation et rappel, au visiteur et à l'équipe, avec invitation iCalendar.
interface BookingMail {
  id: string, start: Date, end: Date, name: string, email: string, company?: string, notes?: string, locale: 'fr' | 'en', token?: string
}

const fmt = (d: Date, locale: 'fr' | 'en', tz: string) => new Intl.DateTimeFormat(locale === 'en' ? 'en-GB' : 'fr-FR', {
  dateStyle: 'full', timeStyle: 'short', timeZone: tz,
}).format(d)

export async function sendBookingMails(b: BookingMail, kind: 'confirmed' | 'cancelled' | 'reminder') {
  const s = bookingSettings()
  const { smtp, public: { siteUrl } } = useRuntimeConfig()
  const site = siteUrl.replace(/\/$/, '')
  const en = b.locale === 'en'
  const when = fmt(b.start, b.locale, s.timezone)
  const cancelUrl = b.token ? `${site}${en ? '/en/book-a-demo' : '/rendez-vous'}?annuler=${b.token}` : ''
  const uid = `booking-${b.id}@${new URL(site).hostname}`
  const summary = en ? `Ipnoria demo with ${b.name}` : `Démonstration Ipnoria avec ${b.name}`
  const description = [
    en ? 'Ipnoria console demo.' : 'Démonstration de la console Ipnoria.',
    s.meetingUrl ? (en ? `Video call: ${s.meetingUrl}` : `Visio : ${s.meetingUrl}`) : '',
  ].filter(Boolean).join('\n')
  const method = kind === 'cancelled' ? 'CANCEL' : 'REQUEST'
  const ics = icsCalendar([icsEvent({
    uid, start: b.start, end: b.end, summary, description, url: s.meetingUrl || undefined,
    organizer: smtp.to || undefined, attendee: b.email, status: kind === 'cancelled' ? 'CANCELLED' : 'CONFIRMED',
  })], method)

  const visitor = {
    confirmed: {
      subject: en ? `Demo booked: ${when}` : `Démonstration réservée : ${when}`,
      text: en
        ? `Hello ${b.name},\n\nYour Ipnoria demo is booked for ${when} (${s.durationMin} minutes).${s.meetingUrl ? `\n\nVideo call: ${s.meetingUrl}` : '\n\nWe will send you the video call link before the meeting.'}\n\nThe invitation is attached to add it to your calendar.\n\nCan't make it? Cancel here: ${cancelUrl}\n`
        : `Bonjour ${b.name},\n\nVotre démonstration d'Ipnoria est réservée le ${when} (${s.durationMin} minutes).${s.meetingUrl ? `\n\nVisio : ${s.meetingUrl}` : '\n\nNous vous envoyons le lien de visio avant le rendez-vous.'}\n\nL'invitation est jointe pour l'ajouter à votre agenda.\n\nUn empêchement ? Annulez ici : ${cancelUrl}\n`,
    },
    reminder: {
      subject: en ? `Reminder: Ipnoria demo ${when}` : `Rappel : démonstration Ipnoria ${when}`,
      text: en
        ? `Hello ${b.name},\n\nReminder: your Ipnoria demo is on ${when}.${s.meetingUrl ? `\n\nVideo call: ${s.meetingUrl}` : ''}\n\nCan't make it? Cancel here: ${cancelUrl}\n`
        : `Bonjour ${b.name},\n\nPetit rappel : votre démonstration d'Ipnoria a lieu le ${when}.${s.meetingUrl ? `\n\nVisio : ${s.meetingUrl}` : ''}\n\nUn empêchement ? Annulez ici : ${cancelUrl}\n`,
    },
    cancelled: {
      subject: en ? `Demo cancelled: ${when}` : `Démonstration annulée : ${when}`,
      text: en
        ? `Hello ${b.name},\n\nYour Ipnoria demo of ${when} is cancelled. Book another slot whenever you like: ${site}/en/book-a-demo\n`
        : `Bonjour ${b.name},\n\nVotre démonstration d'Ipnoria du ${when} est annulée. Réservez un autre créneau quand vous voulez : ${site}/rendez-vous\n`,
    },
  }[kind]

  await sendMail({ to: b.email, subject: visitor.subject, text: visitor.text, icalEvent: kind === 'reminder' ? undefined : { method, content: ics, filename: 'ipnoria-demo.ics' } })

  if (smtp.to && kind !== 'reminder') {
    const team = [
      kind === 'confirmed' ? `Nouvelle démonstration le ${fmt(b.start, 'fr', s.timezone)}` : `Démonstration annulée : ${fmt(b.start, 'fr', s.timezone)}`,
      `Nom : ${b.name}`,
      `E-mail : ${b.email}`,
      `Organisation : ${b.company || '-'}`,
      `Langue : ${b.locale}`,
      '',
      b.notes || '',
    ].join('\n')
    await sendMail({
      to: smtp.to,
      replyTo: { name: b.name, address: b.email },
      subject: kind === 'confirmed' ? `[Ipnoria] Démonstration : ${b.name}, ${fmt(b.start, 'fr', s.timezone)}` : `[Ipnoria] Annulation : ${b.name}`,
      text: team,
      icalEvent: { method, content: ics, filename: 'ipnoria-demo.ics' },
    })
  }
}
