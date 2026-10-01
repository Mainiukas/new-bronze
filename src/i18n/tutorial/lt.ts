/* Mokomojo žaidimo patarėjas lietuviškai (src/i18n/lt.tsx dalis). */

import type { TutorialWords } from './en'

const tutorialWords: TutorialWords = {
  title: 'Mokymas',
  cta: 'Naujas Bronze žaidėjas? Išbandykite mokymą',
  ctaText: 'Vedamas treniruočių žaidimas prieš vieną lengvą robotą. Niekas neskaičiuojama.',
  badge: 'Mokymas · treniruotė, neskaičiuojama',
  you: 'Pameistrys',
  bot: 'Robotas mokytojas',
  progress: (n, total) => `${n} žingsnis iš ${total}`,
  next: 'Toliau',
  back: 'Atgal',
  skip: 'Praleisti mokymą',
  close: 'Uždaryti',
  tips: (n, total) => `Patarimai · ${n}/${total}`,
  minimize: 'Slėpti patarimus',
  waiting: 'Laukiama jūsų ėjimo…',
  steps: {
    welcome: { title: 'Sveiki atvykę į mokymą', text: 'Tai tikras Bronze žaidimas prieš vieną lengvą robotą. Tai treniruotė: ji neišsaugoma, nereitinguojama ir neskaičiuojama. Patarimus galite praleisti bet kada.' },
    board: { title: 'Lenta', text: 'Miestuose yra vietos pramonei (maži kvadratai). Linijos tarp jų – jungtys: kanalai kanalų eroje, geležinkeliai geležinkelių eroje. Tempkite, kad apsižvalgytumėte; artinkite pirštais arba + ir −.' },
    hand: { title: 'Jūsų kortos', text: 'Kiekvienas veiksmas kainuoja vieną kortą. Miesto korta stato tame mieste; pramonės korta stato tą pramonę bet kur jūsų tinkle. Pasirinkite kortą, kad pamatytumėte, ką ji gali.' },
    mat: { title: 'Jūsų lentelė', text: 'Jūsų pramonė nuo žemiausio lygio, su kainomis ir taškais. Pinigai, pajamos ir PT – apačioje. Telefone atverkite ją mygtuku „Jūsų lentelė“.' },
    move: { title: 'Pirmasis ėjimas', text: 'Pasirinkite kortą ir statykite, junkite, tobulinkite, parduokite, imkite paskolą arba praleiskite. Niekas neįsigalioja, kol nepaspausite „Patvirtinti ėjimą“, todėl galite laisvai atšaukti.' },
    bot: { title: 'Tada žaidžia kiti', text: 'Robotas atlieka savo ėjimą. Kiekvieną ratą mažiausiai išleidęs žaidėjas kitame rate eina pirmas. Rato pabaigoje visi gauna pajamas.' },
    markets: { title: 'Anglis, geležis ir prekyba', text: 'Anglis ir geležis gaunamos iš kasyklų ir liejyklų lentoje arba iš rinkų viršuje (pigiausios pirmos). Parduokite medvilnę per uostus ar prekybos centrams, kad apverstumėte fabrikus ir gautumėte pajamų.' },
    eras: { title: 'Dvi eros, tada taškai', text: 'Pasibaigus kanalų erai, jungtys ir apverstos plytelės gauna taškus, kanalai ir I lygio plytelės nuimami, prasideda geležinkelių era. Pabaigoje pinigai duoda 1 PT už kiekvienus £10. Laimi surinkęs daugiausia PT.' },
    done: { title: 'Dabar jūs', text: 'Tai pagrindai. Užbaikite žaidimą prieš robotą arba išeikite per meniu (☰) bet kada. Visos taisyklės – skiltyje „Kaip žaisti“.' },
  },
}

export default tutorialWords
