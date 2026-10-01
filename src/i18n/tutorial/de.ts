/* Der Tutorial-Coach auf Deutsch (Teil von src/i18n/de.tsx). */

import type { TutorialWords } from './en'

const tutorialWords: TutorialWords = {
  title: 'Tutorial',
  cta: 'Neu bei Bronze? Spiel das Tutorial',
  ctaText: 'Eine angeleitete Übungspartie gegen einen leichten Bot. Nichts wird gezählt.',
  badge: 'Tutorial · Übung, zählt nicht',
  you: 'Lehrling',
  bot: 'Lehr-Bot',
  progress: (n, total) => `Schritt ${n} von ${total}`,
  next: 'Weiter',
  back: 'Zurück',
  skip: 'Tutorial überspringen',
  close: 'Schließen',
  tips: (n, total) => `Tipps · ${n}/${total}`,
  minimize: 'Tipps ausblenden',
  waiting: 'Warte auf deinen Zug…',
  steps: {
    welcome: { title: 'Willkommen zum Tutorial', text: 'Dies ist eine echte Partie Bronze gegen einen leichten Bot. Es ist Übung: Sie wird nicht gespeichert, gewertet oder gezählt. Überspringe die Tipps, wann du willst.' },
    board: { title: 'Das Spielbrett', text: 'Städte haben Plätze für Industrien (die kleinen Quadrate). Die Linien dazwischen sind Verbindungen: Kanäle in der Kanal-Epoche, Bahnen in der Eisenbahn-Epoche. Ziehen zum Umsehen, mit zwei Fingern oder + und − zoomen.' },
    hand: { title: 'Deine Hand', text: 'Jede Aktion kostet eine Karte. Eine Stadtkarte baut in dieser Stadt; eine Industriekarte baut diese Industrie überall in deinem Netz. Wähle eine Karte, um zu sehen, was sie kann.' },
    mat: { title: 'Dein Tableau', text: 'Deine Industrien, niedrigste Stufe zuerst, mit Kosten und Punkten. Geld, Einkommen und SP stehen unten. Auf dem Handy öffnest du es mit „Dein Tableau“.' },
    move: { title: 'Dein erster Zug', text: 'Wähle eine Karte und baue, verbinde, entwickle, verkaufe, nimm einen Kredit oder setze aus. Nichts zählt, bis du „Zug bestätigen“ drückst, du kannst also frei rückgängig machen.' },
    bot: { title: 'Dann spielen die anderen', text: 'Der Bot macht seinen Zug. In jeder Runde beginnt, wer am wenigsten ausgegeben hat, die nächste Runde. Am Rundenende erhalten alle Einkommen.' },
    markets: { title: 'Kohle, Eisen und Verkauf', text: 'Kohle und Eisen kommen aus Minen und Hütten auf dem Brett oder von den Märkten oben (günstigste zuerst). Verkaufe Baumwolle über Häfen oder an Handelszentren, um Spinnereien umzudrehen und Einkommen zu erhalten.' },
    eras: { title: 'Zwei Epochen, dann die Wertung', text: 'Am Ende der Kanal-Epoche zählen Verbindungen und umgedrehte Plättchen, Kanäle und Plättchen der Stufe I verlassen das Brett, und die Eisenbahn-Epoche beginnt. Am Ende bringt Geld 1 SP je £10. Die meisten SP gewinnen.' },
    done: { title: 'Jetzt du', text: 'Das sind die Grundlagen. Spiele die Partie gegen den Bot zu Ende oder verlasse sie jederzeit über das Menü (☰). Alle Regeln findest du unter „Spielanleitung“.' },
  },
}

export default tutorialWords
