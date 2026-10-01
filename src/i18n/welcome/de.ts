/* Die Willkommensfolien beim ersten Anmelden, auf Deutsch (Teil von src/i18n/de.tsx). */

import type { WelcomeWords } from './en'

const welcomeWords: WelcomeWords = {
  label: 'Willkommen bei Bronze',
  progress: (n, total) => `Folie ${n} von ${total}`,
  back: 'Zurück',
  continue: 'Weiter',
  begin: 'Los geht’s',
  start: 'Jetzt spielen',
  finishReplay: 'Zurück zur Lobby',
  saving: 'Wird gespeichert …',
  failed: 'Das wurde nicht gespeichert. Prüfe deine Verbindung und versuche es noch einmal.',
  welcome: {
    title: 'Willkommen bei Bronze',
    text: 'Ein Spiel, inspiriert von Brass: Lancashire, Brass: Birmingham und Brass: Pittsburgh.',
    fanMade: 'Bronze ist ein Fanprojekt und steht in keiner Verbindung zu Roxley Games oder den Autoren von Brass und wird von ihnen nicht unterstützt.',
  },
  what: {
    title: 'Baue ein Industrie-Imperium',
    text: 'Die Industrielle Revolution beginnt. Du bist Unternehmer: Baue Baumwollspinnereien, Kohlebergwerke, Eisenhütten, Häfen und Werften, verbinde Städte mit Kanälen und später Eisenbahnen und verkaufe deine Waren im Land und nach Übersee. Das reichste Industrienetz gewinnt.',
    art: 'Eine Fabrikstadt an einem Kanal',
  },
  how: {
    title: 'Zwei Epochen, ein Imperium',
    canal: 'Kanal-Ära – baue deine ersten Industrien und grabe Kanäle.',
    rail: 'Eisenbahn-Ära – Eisenbahnen ersetzen Kanäle, größere Industrien kommen.',
    score: 'Punkte gibt es für umgedrehte Industrien und für Verbindungen. Die meisten Punkte gewinnen.',
    fullRules: 'Alle Regeln',
    rulesTitle: 'Die Regeln',
  },
  rules: {
    title: 'Bevor du spielst',
    text: 'Bronze wird fair gespielt. Wenn du fortfährst, stimmst du zu:',
    terms: 'Ich akzeptiere die',
    termsLink: 'Nutzungsbedingungen',
    privacy: 'Ich akzeptiere die',
    privacyLink: 'Datenschutzerklärung',
    fairPlay: 'Ich spiele fair: kein Schummeln, keine Mehrfachkonten, kein Missbrauch anderer Spieler.',
    allNeeded: 'Setze alle drei Häkchen, um fortzufahren.',
  },
  level: {
    title: 'Wie gut kennst du Bronze?',
    subtitle: 'Wähle, was am besten passt. Das legt nur deine Start-Wertung fest.',
    startsAt: (rating) => `Start bei ${rating}`,
    note: 'Keine Sorge, falls du danebenliegst – deine echte Wertung ergibt sich aus deinen ersten Partien. Anfangs schwankt sie stark, dann pendelt sie sich ein.',
    locked: 'Du hast schon eine gewertete Partie gespielt, deine Stufe ergibt sich also aus deinen Ergebnissen.',
    levels: {
      new: { name: 'Neu bei Bronze', text: 'Ich habe noch nie Bronze oder Brass gespielt.', art: 'Ein einzelnes kleines Häuschen mit dünnem Schornstein in der Dämmerung' },
      beginner: { name: 'Anfänger', text: 'Ich habe ein paar Partien gespielt und kenne die Grundregeln.', art: 'Eine kleine Werkstatt mit Wasserrad, erster Rauch steigt auf' },
      intermediate: { name: 'Fortgeschritten', text: 'Ich spiele regelmäßig und kenne die Strategien.', art: 'Eine Baumwollspinnerei mit zwei Schornsteinen an einem Kanal mit Schmalboot' },
      advanced: { name: 'Experte', text: 'Ich bin stark in Bronze oder Brass und gewinne oft.', art: 'Eine große Industriestadt mit Eisenbahnviadukt, Dampfzug und vielen Schornsteinen' },
    },
  },
  toast: (username) => `Willkommen bei Bronze, ${username}!`,
  replay: 'Willkommen erneut ansehen',
  replayHint: 'Sieh dir die ersten drei Willkommensfolien noch einmal an.',
}

export default welcomeWords
