/* El tutor del tutorial, en español (parte de src/i18n/es.tsx). */

import type { TutorialWords } from './en'

const tutorialWords: TutorialWords = {
  title: 'Tutorial',
  cta: '¿Nuevo en Bronze? Juega el tutorial',
  ctaText: 'Una partida de práctica guiada contra un bot fácil. Nada cuenta.',
  badge: 'Tutorial · práctica, no cuenta',
  you: 'Aprendiz',
  bot: 'Bot tutor',
  progress: (n, total) => `Paso ${n} de ${total}`,
  next: 'Siguiente',
  back: 'Atrás',
  skip: 'Saltar el tutorial',
  close: 'Cerrar',
  tips: (n, total) => `Consejos · ${n}/${total}`,
  minimize: 'Ocultar consejos',
  waiting: 'Esperando tu jugada…',
  steps: {
    welcome: { title: 'Bienvenido al tutorial', text: 'Esta es una partida real de Bronze contra un bot fácil. Es práctica: no se guarda, no puntúa y no cuenta. Salta los consejos cuando quieras.' },
    board: { title: 'El tablero', text: 'Las ciudades tienen huecos para industrias (los cuadraditos). Las líneas entre ellas son enlaces: canales en la era de los canales, vías en la era del ferrocarril. Arrastra para moverte; pellizca o usa + y − para el zoom.' },
    hand: { title: 'Tu mano', text: 'Cada acción cuesta una carta. Una carta de ciudad construye en esa ciudad; una carta de industria construye esa industria en cualquier lugar de tu red. Elige una carta para ver qué puede hacer.' },
    mat: { title: 'Tu tablero', text: 'Tus industrias, del nivel más bajo, con su coste y sus puntos. Tu dinero, ingresos y PV están abajo. En el móvil, ábrelo con «Tu tablero».' },
    move: { title: 'Tu primera jugada', text: 'Elige una carta y construye, enlaza, desarrolla, vende, pide un préstamo o pasa. Nada cuenta hasta que pulses «Confirmar turno», así que puedes deshacer libremente.' },
    bot: { title: 'Luego juegan los demás', text: 'El bot juega su turno. En cada ronda, quien menos gastó empieza la siguiente. Al final de cada ronda todos cobran sus ingresos.' },
    markets: { title: 'Carbón, hierro y ventas', text: 'El carbón y el hierro salen de minas y fundiciones del tablero, o de los mercados de arriba (lo más barato primero). Vende algodón por los puertos o a los centros de comercio para voltear tus hilanderías y ganar ingresos.' },
    eras: { title: 'Dos eras y la puntuación', text: 'Al acabar la era de los canales puntúan los enlaces y las losetas volteadas, los canales y las losetas de nivel I salen del tablero y empieza la era del ferrocarril. Al final, el dinero da 1 PV por cada £10. Gana quien tenga más PV.' },
    done: { title: 'Tu turno', text: 'Eso es lo básico. Termina la partida contra el bot o sal cuando quieras desde el menú (☰). Las reglas completas están en «Cómo jugar».' },
  },
}

export default tutorialWords
