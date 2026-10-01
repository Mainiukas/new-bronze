/* Las diapositivas de bienvenida del primer inicio de sesión, en español (parte de src/i18n/es.tsx). */

import type { WelcomeWords } from './en'

const welcomeWords: WelcomeWords = {
  label: 'Bienvenido a Bronze',
  progress: (n, total) => `Diapositiva ${n} de ${total}`,
  back: 'Atrás',
  continue: 'Continuar',
  begin: 'Empezar',
  start: 'Empezar a jugar',
  finishReplay: 'Volver al vestíbulo',
  saving: 'Guardando…',
  failed: 'No se ha guardado. Comprueba tu conexión e inténtalo de nuevo.',
  welcome: {
    title: 'Bienvenido a Bronze',
    text: 'Un juego inspirado en Brass: Lancashire, Brass: Birmingham y Brass: Pittsburgh.',
    fanMade: 'Bronze es un juego hecho por fans y no está afiliado ni respaldado por Roxley Games ni por los autores de Brass.',
  },
  what: {
    title: 'Construye un imperio industrial',
    text: 'Es el amanecer de la Revolución Industrial. Eres un empresario: construye hilanderías, minas de carbón, fundiciones, puertos y astilleros, une las ciudades con canales y después con el ferrocarril, y vende tus mercancías en el país y al otro lado del mar. Gana la red industrial más rica.',
    art: 'Una ciudad fabril junto a un canal',
  },
  how: {
    title: 'Dos eras, un imperio',
    canal: 'Era de los canales: construye tus primeras industrias y cava canales.',
    rail: 'Era del ferrocarril: el tren sustituye a los canales y llegan industrias mayores.',
    score: 'Suma puntos por tus industrias volteadas y tus conexiones. Gana quien más puntos tenga.',
    fullRules: 'Reglas completas',
    rulesTitle: 'Las reglas',
  },
  rules: {
    title: 'Antes de jugar',
    text: 'En Bronze se juega limpio. Al continuar aceptas:',
    terms: 'Acepto los',
    termsLink: 'Términos del servicio',
    privacy: 'Acepto la',
    privacyLink: 'Política de privacidad',
    fairPlay: 'Jugaré limpio: sin trampas, sin varias cuentas y sin abusar de otros jugadores.',
    allNeeded: 'Marca las tres casillas para continuar.',
  },
  level: {
    title: '¿Cuánto conoces Bronze?',
    subtitle: 'Elige lo que mejor te describa. Solo fija tu puntuación inicial.',
    startsAt: (rating) => `Empieza en ${rating}`,
    note: 'No te preocupes si no aciertas: tu puntuación real la decidirán tus primeras partidas. Al principio cambia mucho y después se estabiliza.',
    locked: 'Ya has jugado una partida puntuada, así que tu nivel lo fijan tus resultados.',
    levels: {
      new: { name: 'Nuevo en Bronze', text: 'Nunca he jugado a Bronze ni a Brass.', art: 'Una casita con una chimenea fina al anochecer' },
      beginner: { name: 'Principiante', text: 'He jugado algunas partidas y conozco las reglas básicas.', art: 'Un pequeño taller con una rueda hidráulica, empieza a salir humo' },
      intermediate: { name: 'Intermedio', text: 'Juego a menudo y conozco las estrategias.', art: 'Una hilandería con dos chimeneas junto a un canal con una barcaza' },
      advanced: { name: 'Avanzado', text: 'Soy fuerte en Bronze o Brass y gano a menudo.', art: 'Una gran ciudad industrial con un viaducto ferroviario, un tren de vapor y muchas chimeneas' },
    },
  },
  toast: (username) => `¡Bienvenido a Bronze, ${username}!`,
  replay: 'Ver la bienvenida otra vez',
  replayHint: 'Vuelve a ver las tres primeras diapositivas de bienvenida.',
}

export default welcomeWords
