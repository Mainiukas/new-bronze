/* Les diapositives de bienvenue à la première connexion, en français (partie de src/i18n/fr.tsx). */

import type { WelcomeWords } from './en'

const welcomeWords: WelcomeWords = {
  label: 'Bienvenue dans Bronze',
  progress: (n, total) => `Diapositive ${n} sur ${total}`,
  back: 'Retour',
  continue: 'Continuer',
  begin: 'Commencer',
  start: 'Commencer à jouer',
  finishReplay: 'Retour au salon',
  saving: 'Enregistrement…',
  failed: 'L’enregistrement a échoué. Vérifiez votre connexion et réessayez.',
  welcome: {
    title: 'Bienvenue dans Bronze',
    text: 'Un jeu inspiré de Brass : Lancashire, Brass : Birmingham et Brass : Pittsburgh.',
    fanMade: 'Bronze est un jeu de fans, sans lien avec Roxley Games ni avec les auteurs de Brass, et non approuvé par eux.',
  },
  what: {
    title: 'Bâtissez un empire industriel',
    text: 'C’est l’aube de la révolution industrielle. Vous êtes entrepreneur : construisez des filatures de coton, des mines de charbon, des forges, des ports et des chantiers navals, reliez les villes par des canaux puis par le rail, et vendez vos marchandises au pays et outre-mer. Le réseau industriel le plus riche l’emporte.',
    art: 'Une ville de filatures au bord d’un canal',
  },
  how: {
    title: 'Deux ères, un empire',
    canal: 'Ère des canaux — construisez vos premières industries et creusez des canaux.',
    rail: 'Ère du rail — le rail remplace les canaux et de plus grandes industries arrivent.',
    score: 'Marquez des points pour vos industries retournées et vos liaisons. Le plus de points l’emporte.',
    fullRules: 'Toutes les règles',
    rulesTitle: 'Les règles',
  },
  rules: {
    title: 'Avant de jouer',
    text: 'Bronze se joue loyalement. En continuant, vous acceptez :',
    terms: 'J’accepte les',
    termsLink: 'Conditions d’utilisation',
    privacy: 'J’accepte la',
    privacyLink: 'Politique de confidentialité',
    fairPlay: 'Je jouerai loyalement : pas de triche, pas de comptes multiples, pas d’abus envers les autres joueurs.',
    allNeeded: 'Cochez les trois cases pour continuer.',
  },
  level: {
    title: 'Connaissez-vous bien Bronze ?',
    subtitle: 'Choisissez ce qui vous correspond le mieux. Cela ne fixe que votre classement de départ.',
    startsAt: (rating) => `Départ à ${rating}`,
    note: 'Pas d’inquiétude si vous vous trompez : votre vrai classement sera établi par vos premières parties. Il bouge beaucoup au début puis se stabilise.',
    locked: 'Vous avez joué une partie classée : votre niveau est déjà fixé par vos résultats.',
    levels: {
      new: { name: 'Nouveau venu', text: 'Je n’ai jamais joué à Bronze ni à Brass.', art: 'Une petite chaumière avec une fine cheminée au crépuscule' },
      beginner: { name: 'Débutant', text: 'J’ai joué quelques parties et je connais les règles de base.', art: 'Un petit atelier avec une roue à aubes, la fumée commence à monter' },
      intermediate: { name: 'Intermédiaire', text: 'Je joue régulièrement et je connais les stratégies.', art: 'Une filature de coton à deux cheminées au bord d’un canal avec une péniche' },
      advanced: { name: 'Avancé', text: 'Je suis fort à Bronze ou à Brass et je gagne souvent.', art: 'Une grande ville industrielle avec un viaduc ferroviaire, un train à vapeur et de nombreuses cheminées' },
    },
  },
  toast: (username) => `Bienvenue dans Bronze, ${username} !`,
  replay: 'Revoir la bienvenue',
  replayHint: 'Revoyez les trois premières diapositives de bienvenue.',
}

export default welcomeWords
