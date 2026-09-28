import type { DataRequestWords, UnsubscribeWords } from './types'

/* The wording of the two legal pages that are forms, in English (the other pages are written out in their own files). */

export const DATA_REQUEST_EN: DataRequestWords = {
  title: 'Data requests',
  intro: (
    <p>
      If you can log in, the quickest way is in the game: Settings → Account has <strong>Download my data</strong> and <strong>Delete my account</strong>. If you
      can’t log in, ask us here.
    </p>
  ),
  howTitle: 'How it works',
  how: [
    'We answer within 30 days (one month). For complex requests this can be extended by two months; we’ll tell you within the first month.',
    'To protect your account, we’ll reply to the email address of the account and may ask you to confirm the request from it.',
  ],
  rights: (link) => <>Your rights are explained in the {link}.</>,
  formTitle: 'Make a request',
  formIntro: (email) => <>This form writes an email for you to send from your own email app, to {email}. Nothing is sent until you send it.</>,
  noAddress: 'The operator’s email address isn’t filled in yet, so this form can’t be sent.',
  what: 'What would you like?',
  requests: {
    access: 'A copy of my data (access / portability)',
    erasure: 'Delete my account and data',
    rectification: 'Correct my data',
    objection: 'Object to or restrict processing',
    other: 'Something else',
  },
  email: 'Your account’s email address',
  emailError: 'Enter the email address of your Bronze account, so we can find it and reply.',
  username: 'Username (optional)',
  details: 'Details (optional)',
  submit: 'Write the email',
  subject: (request) => `Bronze data request: ${request}`,
  body: (request, email, username, details) => [`Request: ${request}`, `Account email: ${email}`, `Username: ${username}`, '', details].join('\n'),
  notGiven: '(not given)',
}

export const UNSUBSCRIBE_EN: UnsubscribeWords = {
  title: 'Unsubscribe',
  lists: { marketing: 'news about Bronze', friends: 'friend emails', tournaments: 'tournament emails', all: 'every optional email' },
  done: 'You’re unsubscribed',
  working: 'Unsubscribing…',
  failed: 'Couldn’t unsubscribe',
  doneBody: (list) => `You won’t get ${list} any more. It can take a few minutes for emails already on their way.`,
  workingBody: 'One moment…',
  notFoundBody: 'This unsubscribe link isn’t valid. It may have been copied incompletely.',
  failedBody: 'Something went wrong. Please try the link again in a minute.',
  unavailableBody: 'Accounts aren’t set up on this site, so there are no emails to unsubscribe from.',
  more: (link) => <>You can change all your email choices, when logged in, in Settings → Notifications. Questions: {link}.</>,
  dataRequests: 'data requests',
}
