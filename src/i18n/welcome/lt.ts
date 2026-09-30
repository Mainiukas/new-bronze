/* Pirmojo prisijungimo pasveikinimo skaidrės lietuviškai (src/i18n/lt.tsx dalis). */

import type { WelcomeWords } from './en'

const welcomeWords: WelcomeWords = {
  label: 'Sveiki atvykę į Bronze',
  progress: (n, total) => `${n} skaidrė iš ${total}`,
  back: 'Atgal',
  continue: 'Tęsti',
  begin: 'Pradėti',
  start: 'Pradėti žaisti',
  finishReplay: 'Grįžti į fojė',
  saving: 'Išsaugoma…',
  failed: 'Nepavyko išsaugoti. Patikrinkite ryšį ir bandykite dar kartą.',
  welcome: {
    title: 'Sveiki atvykę į Bronze',
    text: 'Žaidimas, įkvėptas Brass: Lancashire, Brass: Birmingham ir Brass: Pittsburgh.',
    fanMade: 'Bronze – gerbėjų sukurtas žaidimas, nesusijęs su Roxley Games ar Brass kūrėjais ir jų nepatvirtintas.',
  },
  what: {
    title: 'Sukurkite pramonės imperiją',
    text: 'Pramonės revoliucijos aušra. Jūs – verslininkas: statykite medvilnės fabrikus, anglių kasyklas, geležies liejyklas, uostus ir laivų statyklas, sujunkite miestus kanalais, vėliau geležinkeliais, ir parduokite prekes šalyje bei už jūros. Laimi turtingiausias pramonės tinklas.',
    art: 'Fabrikų miestelis prie kanalo',
  },
  how: {
    title: 'Dvi eros, viena imperija',
    canal: 'Kanalų era – pastatykite pirmąsias įmones ir iškaskite kanalus.',
    rail: 'Geležinkelių era – geležinkeliai pakeičia kanalus, atsiranda didesnės įmonės.',
    score: 'Taškus gaunate už apverstas įmones ir jungtis. Laimi surinkęs daugiausia taškų.',
    fullRules: 'Visos taisyklės',
    rulesTitle: 'Taisyklės',
  },
  rules: {
    title: 'Prieš pradedant',
    text: 'Bronze žaidžiama sąžiningai. Tęsdami sutinkate:',
    terms: 'Sutinku su',
    termsLink: 'Paslaugų teikimo sąlygomis',
    privacy: 'Sutinku su',
    privacyLink: 'Privatumo politika',
    fairPlay: 'Žaisiu sąžiningai: jokio sukčiavimo, jokių kelių paskyrų, jokio kitų žaidėjų įžeidinėjimo.',
    allNeeded: 'Pažymėkite visus tris, kad galėtumėte tęsti.',
  },
  level: {
    title: 'Kaip gerai pažįstate Bronze?',
    subtitle: 'Pasirinkite, kas jums labiausiai tinka. Tai nustato tik pradinį reitingą.',
    startsAt: (rating) => `Pradžia: ${rating}`,
    note: 'Nesijaudinkite, jei pasirinksite netiksliai – tikrąjį reitingą nulems pirmosios partijos. Pradžioje jis labai svyruoja, o vėliau nusistovi.',
    locked: 'Jau sužaidėte reitingo partiją, todėl jūsų lygį nustato rezultatai.',
    levels: {
      new: { name: 'Naujokas', text: 'Niekada nežaidžiau Bronze ar Brass.', art: 'Vienas mažas namelis su plonu kaminu sutemus' },
      beginner: { name: 'Pradedantysis', text: 'Esu sužaidęs kelias partijas ir žinau pagrindines taisykles.', art: 'Nedidelės dirbtuvės su vandens ratu, kyla dūmai' },
      intermediate: { name: 'Pažengęs', text: 'Žaidžiu reguliariai ir išmanau strategijas.', art: 'Medvilnės fabrikas su dviem kaminais prie kanalo su barža' },
      advanced: { name: 'Ekspertas', text: 'Gerai žaidžiu Bronze ar Brass ir dažnai laimiu.', art: 'Didelis pramonės miestas su geležinkelio viadūku, garvežiu ir daugybe kaminų' },
    },
  },
  toast: (username) => `Sveiki atvykę į Bronze, ${username}!`,
  replay: 'Peržiūrėti pasveikinimą',
  replayHint: 'Dar kartą peržiūrėkite pirmąsias tris pasveikinimo skaidres.',
}

export default welcomeWords
