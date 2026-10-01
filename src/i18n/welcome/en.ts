/* The first-time welcome slides, in English (part of src/i18n/en.tsx). */

const welcomeWords = {
  label: 'Welcome to Bronze',
  progress: (n: number, total: number) => `Slide ${n} of ${total}`,
  back: 'Back',
  continue: 'Continue',
  begin: 'Begin',
  start: 'Start playing',
  finishReplay: 'Back to the lobby',
  saving: 'Saving…',
  failed: 'That didn’t save. Check your connection and try again.',
  welcome: {
    title: 'Welcome to Bronze',
    text: 'A game inspired by Brass: Lancashire, Brass: Birmingham and Brass: Pittsburgh.',
    fanMade: 'Bronze is a fan-made game and is not affiliated with or endorsed by Roxley Games or the designers of Brass.',
  },
  what: {
    title: 'Build an industrial empire',
    text: 'It’s the dawn of the Industrial Revolution. You are an entrepreneur: build cotton mills, coal mines, iron works, ports and shipyards, connect towns with canals and later railways, and sell your goods at home and across the sea. The richest network of industry wins.',
    art: 'A mill town beside a canal',
  },
  how: {
    title: 'Two eras, one empire',
    canal: 'Canal Era — build your first industries and dig canals.',
    rail: 'Rail Era — railways replace canals and bigger industries arrive.',
    score: 'Score points for your flipped industries and your links. Most points wins.',
    fullRules: 'Full rules',
    rulesTitle: 'The rules',
  },
  rules: {
    title: 'Before you play',
    text: 'Bronze is played fairly. By continuing you agree to:',
    terms: 'I accept the',
    termsLink: 'Terms of Service',
    privacy: 'I accept the',
    privacyLink: 'Privacy Policy',
    fairPlay: 'I will play fairly: no cheating, no multiple accounts, no abuse of other players.',
    allNeeded: 'Tick all three to continue.',
  },
  level: {
    title: 'How well do you know Bronze?',
    subtitle: 'Pick what fits you best. This only sets your starting rating.',
    startsAt: (rating: number) => `Starts at ${rating}`,
    note: 'Don’t worry about picking wrong — your real rating will be decided by your first games. It moves a lot at the start and settles down as you play more.',
    locked: 'You’ve played a rated game, so your level is already set by your results.',
    levels: {
      new: { name: 'New to Bronze', text: 'I’ve never played Bronze or Brass.', art: 'A single small cottage with a thin chimney at dusk' },
      beginner: { name: 'Beginner', text: 'I’ve played a few games and know the basic rules.', art: 'A small workshop with a water wheel, smoke starting to rise' },
      intermediate: { name: 'Intermediate', text: 'I play regularly and know the strategies.', art: 'A cotton mill with two chimneys beside a canal with a narrowboat' },
      advanced: { name: 'Advanced', text: 'I’m strong at Bronze or Brass and win often.', art: 'A big industrial town with a railway viaduct, a steam train and many chimneys' },
    },
  },
  toast: (username: string) => `Welcome to Bronze, ${username}!`,
  replay: 'Replay welcome',
  replayHint: 'See the first three welcome slides again.',
}

export type WelcomeWords = typeof welcomeWords
export default welcomeWords
