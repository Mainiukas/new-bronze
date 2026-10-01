/* The tutorial's coach, in English (part of src/i18n/en.tsx). */

const tutorialWords = {
  title: 'Tutorial',
  cta: 'New to Bronze? Play the tutorial',
  ctaText: 'A guided practice game against one Easy bot. Nothing counts.',
  badge: 'Tutorial · practice, not counted',
  you: 'Apprentice',
  bot: 'Tutor bot',
  progress: (n: number, total: number) => `Step ${n} of ${total}`,
  next: 'Next',
  back: 'Back',
  skip: 'Skip tutorial',
  close: 'Close',
  tips: (n: number, total: number) => `Tips · ${n}/${total}`,
  minimize: 'Hide tips',
  waiting: 'Waiting for your move…',
  steps: {
    welcome: { title: 'Welcome to the tutorial', text: 'This is a real game of Bronze against one Easy bot. It’s practice: it isn’t saved, rated or counted. Skip the tips whenever you like.' },
    board: { title: 'The board', text: 'Towns have slots for industries (the small squares). Lines between them are links: canals in the canal era, railways in the rail era. Drag to look around, pinch or use + and − to zoom.' },
    hand: { title: 'Your hand', text: 'Every action costs one card. A town card builds in that town; an industry card builds that industry anywhere in your network. Pick a card to see what it can do.' },
    mat: { title: 'Your mat', text: 'Your industries, lowest level first, with what each costs and scores. Your money, income and VP are at the bottom. On a phone, open it with “Your mat”.' },
    move: { title: 'Your first move', text: 'Pick a card and build, link, develop, sell, take a loan, or skip. Nothing counts until you press Confirm turn, so you can Undo freely.' },
    bot: { title: 'Then the others play', text: 'The bot takes its turn. Each round, the player who spent least goes first next round. At the end of each round everyone collects income.' },
    markets: { title: 'Coal, iron and selling', text: 'Coal and iron come from mines and works on the board, or from the markets at the top (cheapest first). Sell cotton through ports or to trade hubs to flip your mills and earn income.' },
    eras: { title: 'Two eras, then scoring', text: 'When the canal era ends, links and flipped tiles score, canals and level I tiles leave the board, and the rail era begins. At the end, money adds 1 VP per £10. Most VP wins.' },
    done: { title: 'Over to you', text: 'That’s the basics. Finish this game against the bot, or leave from the menu (☰) at any time. The full rules are in How to Play.' },
  },
}

export type TutorialWords = typeof tutorialWords
export default tutorialWords
