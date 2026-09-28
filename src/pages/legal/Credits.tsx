import { Localized } from './text/Localized'
import { DataTable, Fill, LegalPage, Section } from '../../components/legal/LegalPage'
import { OPERATOR } from '../../legal/operator'

const fileLink = (href: string, label: string) => (
  <a href={href} className="font-semibold text-brass-300 underline underline-offset-2 hover:text-brass-200">
    {label}
  </a>
)

/**
 * Credits and the attributions the licences ask for. The software list with
 * full licence texts is THIRD_PARTY_NOTICES (npm run notices).
 */
function CreditsEnglish() {
  return (
    <LegalPage
      ornate
      title="Credits"
      intro={
        <p>
          Bronze is an original industrial-era strategy game by <Fill value={OPERATOR.name} />. It is built on the work of others, credited below.
        </p>
      }
    >
      <Section id="fonts" title="Fonts">
        <DataTable
          caption="Fonts"
          head={['Font', 'Author', 'Licence']}
          rows={[
            ['Cinzel', 'Copyright 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel)', fileLink('licenses/OFL-cinzel.txt', 'SIL Open Font License 1.1')],
            ['Barlow', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow.txt', 'SIL Open Font License 1.1')],
            [
              'Barlow Condensed',
              'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)',
              fileLink('licenses/OFL-barlow-condensed.txt', 'SIL Open Font License 1.1'),
            ],
          ]}
        />
        <p className="text-sm">The fonts are served from Bronze’s own files (packaged by Fontsource), not loaded from Google or any other server.</p>
      </Section>

      <Section id="art" title="Art and sound">
        <DataTable
          caption="Art and sound"
          head={['What', 'Made by']}
          rows={[
            [
              'The painted map, industry icons, route textures, link tokens and hexagons, trade hub pictures, lobby panels and brass buttons',
              <>
                <Fill value={OPERATOR.name} />, with AI image generation tools
              </>,
            ],
            ['Background paintings', 'AI-generated for Bronze'],
            ['Logo and ornaments', 'Made for Bronze'],
            ['Interface icons', 'Drawn for Bronze'],
            ['The “G” on the sign-in button', 'Google’s logo, a trademark of Google LLC, used on the sign-in button as Google’s sign-in guidelines ask'],
            ['Sound effects and music', 'Generated in your browser as you play (Web Audio): no recordings'],
          ]}
        />
      </Section>

      <Section id="software" title="Software">
        <p>
          Bronze is built with React, React Router, Supabase’s JavaScript client, Tailwind CSS and Vite, all under the MIT licence, and a few smaller
          open-source packages. The full list, with every licence text: {fileLink('THIRD_PARTY_NOTICES.txt', 'Third-party notices')}.
        </p>
      </Section>
    </LegalPage>
  )
}

/** In the player's language (a translation, with the English text prevailing), or in English. */
export function Credits() {
  return <Localized page="Credits" english={CreditsEnglish} />
}
