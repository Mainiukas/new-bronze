/* Le coach du tutoriel, en français (partie de src/i18n/fr.tsx). */

import type { TutorialWords } from './en'

const tutorialWords: TutorialWords = {
  title: 'Tutoriel',
  cta: 'Nouveau sur Bronze ? Jouez le tutoriel',
  ctaText: 'Une partie d’entraînement guidée contre un bot facile. Rien ne compte.',
  badge: 'Tutoriel · entraînement, non compté',
  you: 'Apprenti',
  bot: 'Bot tuteur',
  progress: (n, total) => `Étape ${n} sur ${total}`,
  next: 'Suivant',
  back: 'Retour',
  skip: 'Passer le tutoriel',
  close: 'Fermer',
  tips: (n, total) => `Conseils · ${n}/${total}`,
  minimize: 'Masquer les conseils',
  waiting: 'En attente de votre coup…',
  steps: {
    welcome: { title: 'Bienvenue dans le tutoriel', text: 'Ceci est une vraie partie de Bronze contre un bot facile. C’est un entraînement : elle n’est ni sauvegardée, ni classée, ni comptée. Passez les conseils quand vous voulez.' },
    board: { title: 'Le plateau', text: 'Les villes ont des emplacements pour les industries (les petits carrés). Les lignes entre elles sont des liaisons : canaux à l’ère des canaux, voies ferrées à l’ère du rail. Faites glisser pour vous déplacer, pincez ou utilisez + et − pour zoomer.' },
    hand: { title: 'Votre main', text: 'Chaque action coûte une carte. Une carte de ville construit dans cette ville ; une carte d’industrie construit cette industrie n’importe où dans votre réseau. Choisissez une carte pour voir ce qu’elle permet.' },
    mat: { title: 'Votre plateau', text: 'Vos industries, du niveau le plus bas, avec leur coût et leurs points. Votre argent, revenu et PV sont en bas. Sur téléphone, ouvrez-le avec « Votre plateau ».' },
    move: { title: 'Votre premier coup', text: 'Choisissez une carte et construisez, reliez, développez, vendez, empruntez ou passez. Rien ne compte avant « Confirmer le tour », vous pouvez donc annuler librement.' },
    bot: { title: 'Puis les autres jouent', text: 'Le bot joue son tour. À chaque manche, celui qui a le moins dépensé joue en premier à la manche suivante. En fin de manche, chacun touche son revenu.' },
    markets: { title: 'Charbon, fer et ventes', text: 'Le charbon et le fer viennent des mines et forges du plateau, ou des marchés en haut (les moins chers d’abord). Vendez le coton par les ports ou aux comptoirs pour retourner vos filatures et gagner du revenu.' },
    eras: { title: 'Deux ères, puis le décompte', text: 'À la fin de l’ère des canaux, liaisons et tuiles retournées marquent, les canaux et tuiles de niveau I quittent le plateau, et l’ère du rail commence. À la fin, l’argent rapporte 1 PV par £10. Le plus de PV gagne.' },
    done: { title: 'À vous de jouer', text: 'Voilà l’essentiel. Terminez la partie contre le bot, ou quittez-la à tout moment par le menu (☰). Les règles complètes sont dans « Comment jouer ».' },
  },
}

export default tutorialWords
