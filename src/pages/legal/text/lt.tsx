/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
import { STORAGE_ITEMS, type DataItem } from '../../../legal/inventory'
import { MIN_ACCOUNT_AGE, OPERATOR, SERVICES } from '../../../legal/operator'
import { DocumentLinks, fileLink, linkClass as link, strongClass as strong } from './shared'
import type { InventoryText, LegalText } from './types'

/* Teisiniai puslapiai lietuviškai. Vertimas; jei jis skiriasi nuo angliškojo teksto, galioja angliškasis. */

const UNTIL_DELETED = 'Kol ištrinsite paskyrą'
const CONTRACT = 'Sutartis (BDAR 6 str. 1 d. b p.)'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Įsimena, kad matėte pranešimą apie slapukus, jo datą ir politikos versiją.',
      duration: '12 mėnesių arba kol pasikeis politika',
    },
    'bronze.auth': {
      where: 'Vietinė saugykla',
      provider: 'Bronze (Supabase prisijungimo biblioteka)',
      purpose: 'Leidžia likti prisijungus: jūsų sesijos raktai ir pagrindiniai paskyros duomenys (paskyros ID, el. pašto adresas).',
      duration: 'Kol atsijungsite; be „Prisiminti mane“ – kol uždarysite naršyklę',
    },
    'bronze.auth-code-verifier': {
      where: 'Vietinė saugykla',
      provider: 'Bronze (Supabase prisijungimo biblioteka)',
      purpose: 'Vienkartinė paslaptis, saugiai užbaigianti prisijungimą per „Google“ ar el. laiško nuorodą.',
      duration: 'Pašalinama panaudojus',
    },
    'bronze.auth-user': {
      where: 'Vietinė saugykla',
      provider: 'Bronze (Supabase prisijungimo biblioteka)',
      purpose: 'Paskyros duomenys, kuriuos kai kurios prisijungimo bibliotekos versijos laiko šalia sesijos.',
      duration: 'Kol atsijungsite',
    },
    'bronze.auth.remember': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Ar prisijungdami pažymėjote „Prisiminti mane“.',
      duration: 'Iki kito prisijungimo',
    },
    bronze_session_alive: {
      where: 'Slapukas',
      provider: 'Bronze',
      purpose: 'Praneša Bronze, kad naršyklė buvo uždaryta, kad prisijungimas be „Prisiminti mane“ baigtųsi. Saugo tik reikšmę 1.',
      duration: 'Kol uždarysite naršyklę (sesijos slapukas)',
    },
    'bronze.auth.returnTo': {
      where: 'Sesijos saugykla',
      provider: 'Bronze',
      purpose: 'Puslapis, į kurį grįžtama prisijungus per „Google“.',
      duration: 'Tik šiame skirtuke; pašalinama prisijungus',
    },
    'bronze.auth.failures': {
      where: 'Sesijos saugykla',
      provider: 'Bronze',
      purpose: 'Skaičiuoja neteisingus slaptažodžius, kad po 5 prisijungimai būtų sustabdyti 30 sekundžių (saugumas).',
      duration: 'Tik šiame skirtuke',
    },
    'bronze.match': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Jūsų žaidžiama partija, kad „Tęsti“ ją pratęstų ten, kur baigėte.',
      duration: 'Kol partija baigsis arba ją nutrauksite',
    },
    'bronze.stats.pending.<id>': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Jūsų paskyros baigtos partijos (ir svečio rezultatai), kol serveris patvirtins kiekvienos išsaugojimą, kad dingus ryšiui niekas neprarastų.',
      duration: 'Pašalinama išsaugojus',
    },
    'bronze.boardDraft.v2': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Neišsaugoti žemėlapio redaktoriaus pakeitimai (#/board?edit=1). Sukuriama, tik jei naudojate redaktorių.',
      duration: 'Kol juos atkursite',
    },
    'bronze.settings': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Jūsų nustatymai: kalba, garsas, garsumas, animacijos ir kompiuterio greitis, ėjimo laikmatis, partijos žurnalas.',
      duration: 'Kol išvalysite',
    },
    'bronze.lobby.gameMode': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Paskutinis jūsų pasirinktas žaidimo režimas.',
      duration: 'Kol išvalysite',
    },
    'bronze.lobby.map': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Paskutinis jūsų pasirinktas žemėlapis.',
      duration: 'Kol išvalysite',
    },
    'bronze.setup': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Paskutinį kartą nustatytos partijos vietos: vardai, spalvos ir kompiuterio lygiai.',
      duration: 'Kol išvalysite',
    },
    'bronze.stats': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Jūsų rezultatai ir pasiekimai žaidžiant kaip svečias (prisijungus perkeliami į paskyrą).',
      duration: 'Kol išvalysite arba prisijungsite',
    },
  },
  account: [
    {
      what: 'El. pašto adresas',
      why: 'Kad galėtumėte prisijungti, ir paskyros laiškams (adreso patvirtinimui, slaptažodžio atkūrimui, saugumo pranešimams, kai pasikeičia jūsų slaptažodis, el. paštas ar dviejų veiksnių nustatymai).',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    { what: 'Slaptažodis', why: 'Kad galėtumėte prisijungti. „Supabase“ saugo tik vienkryptę maišos reikšmę; niekas negali jo perskaityti.', basis: CONTRACT, retention: UNTIL_DELETED },
    { what: 'Vartotojo vardas', why: 'Jūsų vardas žaidime. Jį mato visi, kad ir kokie būtų jūsų privatumo nustatymai.', basis: CONTRACT, retention: UNTIL_DELETED },
    {
      what: 'Ankstesni vartotojo vardai ir kada juos pakeitėte',
      why: 'Kad nuorodos į seną vardą 30 dienų vestų į jūsų profilį ir kad per tą laiką niekas kitas negalėtų jo užimti (ir apsimesti jumis).',
      basis: 'Teisėtas interesas užkirsti kelią apsimetinėjimui (BDAR 6 str. 1 d. f p.)',
      retention: '30 dienų',
    },
    {
      what: 'Profilio duomenys, kuriuos nusprendžiate pridėti: aprašymas, šalis, avataras (paruoštas arba jūsų įkeltas paveikslėlis); ir jūsų privatumo nustatymai',
      why: 'Rodomi jūsų profilyje tiems, kam leidžia jūsų privatumo nustatymai.',
      basis: CONTRACT,
      retention: 'Kol juos pakeisite arba ištrinsite paskyrą',
    },
    {
      what: '„Google“ paskyros duomenys (vardas, el. pašto adresas, profilio nuotrauka, „Google“ paskyros ID), tik jei jungiatės per „Google“',
      why: 'Prisijungimui per „Google“. Pagal vardą pasiūlomas vartotojo vardas; nuotrauka rodoma kaip avataras, kurį mato kiti žaidėjai.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Amžiaus patvirtinimas: ar jums 14–17, ar 18 ir daugiau metų (ne gimimo data)',
      why: 'Paskyros skirtos tik 14 metų ir vyresniems; jaunesniems nei 18 rinkodaros laiškai nesiunčiami.',
      basis: 'Teisinė prievolė (BDAR 6 str. 1 d. c p., 8 str.)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Sutikimų įrašai: su kuo sutikote (Sąlygos, Privatumo politika, rinkodaros laiškai), versija ir laikas',
      why: 'Kad galėtume parodyti, su kuo sutikote, kaip reikalauja įstatymas.',
      basis: 'Teisinė prievolė (BDAR 6 str. 1 d. c p., 7 str. 1 d.)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'El. laiškų nuostatos (rinkodaros, draugų ir turnyrų laiškai; visi išjungti, kol neįjungsite)',
      why: 'Kad siųstume tik jūsų pageidaujamus laiškus ir leistume atsisakyti vienu spustelėjimu.',
      basis: 'Sutikimas rinkodarai (BDAR 6 str. 1 d. a p.); sutartis kitiems (6 str. 1 d. b p.)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Žaidimo rezultatai: partijos, pergalės, geriausias rezultatas, išgabentos prekės, žaisti žemėlapiai, pasiekimai ir jų atrakinimo laikas, prisijungimo data; atsitiktinis kiekvieno išsaugoto rezultato ID',
      why: 'Jūsų profilis ir pasiekimai, rodomi tiems, kam leidžia jūsų privatumo nustatymai. ID užtikrina, kad du kartus išsiųstas rezultatas būtų įskaitytas vieną kartą.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Partijų istorija: kiekvienos baigtos partijos laikas, žemėlapis ir žaidimo režimas, žaidėjų skaičius, jūsų vieta, rezultatas, išgabentos prekės, nutiestos jungtys ir pastatyti pramonės objektai',
      why: 'Paskutinės jūsų partijos ir statistika profilyje, rodomos tiems, kam leidžia jūsų privatumo nustatymai.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Internetinės partijos: kokias partijas žaidėte, jūsų vieta, kiekvienas jūsų ėjimas ir jo laikas, rezultatas, jūsų laikrodis ir ryšys partijos metu',
      why: 'Internetinėms partijoms vykdyti: patikrinti kiekvieną ėjimą, užtikrinti sąžiningumą, rodyti partiją jos žaidėjams (ir viešų partijų stebėtojams) ir leisti ją peržiūrėti.',
      basis: CONTRACT,
      retention: 'Kol partija saugoma. Jei ištrinsite paskyrą, jūsų vietoje bus rodoma „Ištrintas žaidėjas“ ir ji nebebus susieta su jumis; ėjimai lieka, kad kiti žaidėjai išsaugotų savo partiją.',
    },
    {
      what: 'Reitingai: jūsų reitingas kiekviename žemėlapyje, jo tikslumas, sužaistų partijų skaičius, geriausias reitingas ir kiekvienas pokytis po reitinguotos partijos',
      why: 'Kad būtų sudaromos panašaus lygio žaidėjų poros, o reitingai rodomi profiliuose ir lyderių lentelėje.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Draugai: žaidėjai, kuriuos pridėjote, išsiųsti ir gauti draugystės kvietimai bei kvietimai į partijas',
      why: 'Jūsų draugų sąrašas, kvietimai ir pakvietimai į partijas.',
      basis: CONTRACT,
      retention: 'Kol jūs arba jūsų draugas jį pašalinsite arba vienas iš jūsų ištrins paskyrą. Kvietimas į partiją dingsta, kai panaudojamas arba partija prasideda.',
    },
    {
      what: 'Būsena internete: kada jūsų programėlė paskutinį kartą susisiekė su žaidimo serveriu',
      why: 'Kad draugai matytų, ar esate prisijungę (matyti per paskutines 2 minutes).',
      basis: CONTRACT,
      retention: 'Kaskart pakeičiama nauja; ištrinama kartu su paskyra',
    },
    {
      what: 'Greitas žaidimas: jūsų reitingas ir norimos partijos tipas, kol laukiate varžovų',
      why: 'Kad rastume panašaus lygio žaidėjų.',
      basis: CONTRACT,
      retention: 'Kol rasite varžovų arba nustosite laukti',
    },
    {
      what: 'Dviejų veiksnių autentifikavimas, tik jei jį įjungiate: autentifikavimo programėlės raktas (jį saugo „Supabase“) ir atkūrimo kodai (saugomi tik kaip vienkryptės maišos reikšmės)',
      why: 'Kad jungiantis būtų paprašyta kodo iš jūsų telefono, o jį praradus galėtumėte prisijungti atkūrimo kodu.',
      basis: CONTRACT,
      retention: 'Kol jį išjungsite arba ištrinsite paskyrą',
    },
    {
      what: 'Pranešimai apie žaidėjus: kai pranešate apie žaidėją arba žaidėjas praneša apie jus – apie ką, priežastis, pastaba ir kada',
      why: 'Kad galėtume išnagrinėti sukčiavimą, įžeidžiančius vardus, priekabiavimą ir šlamštą, o žaidimas liktų sąžiningas ir saugus.',
      basis: 'Teisėtas interesas užtikrinti saugų žaidimą (BDAR 6 str. 1 d. f p.)',
      retention: '12 mėnesių; anksčiau, jei paskyra, apie kurią pranešta, ištrinama',
    },
    {
      what: 'Piktnaudžiavimo skaitikliai: jūsų paskyros ID (arba, kol neprisijungėte, IP adresas), koks veiksmas ir kiek kartų bandyta',
      why: 'Kad būtų ribojama, kaip dažnai galima bandyti slaptažodžius, kodus, vartotojo vardų patikras ir pranešimus – apsaugai nuo spėliojimo ir šlamšto.',
      basis: 'Teisėtas interesas užtikrinti saugumą (BDAR 6 str. 1 d. f p.)',
      retention: 'Ištrinama po paros',
    },
    {
      what: 'Nesėkmingų prisijungimų skaitiklis: bandytas vartotojo vardas, kiek neteisingų slaptažodžių ir kada',
      why: 'Kad po 5 neteisingų slaptažodžių prisijungimai būtų sustabdyti 30 sekundžių, apsaugant nuo slaptažodžių spėliojimo.',
      basis: 'Teisėtas interesas užtikrinti saugumą (BDAR 6 str. 1 d. f p.)',
      retention: 'Išvaloma sėkmingai prisijungus; kitu atveju ištrinama po paros',
    },
    {
      what: '„Supabase“ saugomi prisijungimo įvykiai (laikas, IP adresas, naršyklė)',
      why: 'Prisijungimo paslaugos saugumas ir jūsų paskutinių prisijungimų sąrašas skiltyje Paskyros nustatymai → Saugumas (matote tik jūs).',
      basis: 'Teisėtas interesas užtikrinti saugumą (BDAR 6 str. 1 d. f p.)',
      retention: SERVICES.authLogRetention,
    },
  ],
  visitor: [
    {
      what: 'Prieglobos paslaugų teikėjo serverio žurnalai (IP adresas, užklausti puslapiai, naršyklė, laikas)',
      why: 'Kad svetainė veiktų ir būtų saugi.',
      basis: 'Teisėtas interesas (BDAR 6 str. 1 d. f p.)',
      retention: SERVICES.hostingLogRetention,
    },
  ],
  recipients: [
    {
      name: 'Supabase, Inc.',
      role: 'Duomenų tvarkytojas: duomenų bazė, prisijungimas ir paskyros laiškai',
      data: 'Visi aukščiau išvardyti paskyros duomenys',
      location: `Projekto regionas: ${SERVICES.supabaseRegion}. „Supabase“ yra JAV bendrovė.`,
    },
    {
      name: 'Google (EEE gyventojams – Google Ireland Limited)',
      role: 'Savarankiškas duomenų valdytojas, tik jei pasirenkate „Tęsti su „Google““',
      data: '„Google“ patvirtina jūsų tapatybę ir perduoda Bronze jūsų vardą, el. pašto adresą ir nuotrauką',
      location: 'Žr. „Google“ privatumo politiką',
    },
    { name: SERVICES.hosting, role: 'Duomenų tvarkytojas: talpina svetainės failus', data: 'Serverio žurnalai (IP adresas, užklausti puslapiai, naršyklė)', location: SERVICES.hosting },
    { name: SERVICES.emailProvider, role: 'Duomenų tvarkytojas: siunčia paskyros laiškus', data: 'El. pašto adresas ir laiško turinys', location: SERVICES.emailProvider },
    {
      name: 'Kiti žaidėjai ir lankytojai',
      role: 'Mato jūsų profilį, kiek leidžia jūsų privatumo nustatymai',
      data: 'Visada vartotojo vardas ir avataras. Jei profilis viešas (arba matomas draugams – jūsų draugams), taip pat aprašymas, šalis, rezultatai, reitingai, paskutinės partijos ir prisijungimo data. Internetinėse partijose – jūsų vieta, ėjimai ir rezultatas (partijos žaidėjams ir viešų partijų stebėtojams). Draugai mato, kada esate prisijungę. Nusistovėjęs reitingas rodomas lyderių lentelėje.',
      location: 'Visur, kur žaidžiama Bronze',
    },
  ],
}

const HEAD = ['Kas', 'Kodėl', 'Teisinis pagrindas', 'Kiek laiko']
const dataRows = (items: DataItem[]) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])

const storageRows = () =>
  STORAGE_ITEMS.map((item) => {
    const text = inventory.storage[item.key]
    return [
      <code key="k" className="font-mono text-[0.85em] break-all">
        {item.key}
      </code>,
      text?.where ?? item.where,
      text?.provider ?? item.provider,
      text?.purpose ?? item.purpose,
      text?.duration ?? item.duration,
    ]
  })

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privatumo politika"
      intro={<p>Šiame puslapyje paprastais žodžiais paaiškinta, ką Bronze apie jus žino, kodėl, kas dar tai mato ir ką galite dėl to padaryti.</p>}
    >
      <Section id="short" title="Trumpai">
        <Bullets>
          <li>Prieš kompiuterį galite žaisti kaip svečias. Tada mums apie jus nesiunčiama nieko.</li>
          <li>Paskyrai reikia el. pašto adreso, slaptažodžio (arba „Google“) ir vartotojo vardo. Visa kita – jūsų pasirinkimu.</li>
          <li>Internetinėse partijose išsaugomas kiekvienas ėjimas, kad žaidimas būtų sąžiningas ir partiją būtų galima peržiūrėti.</li>
          <li>Jokios reklamos, analitikos ar sekimo. Jūsų duomenų niekada neparduodame.</li>
          <li>
            Viską, ką apie jus turime, galite bet kada atsisiųsti arba ištrinti paskyrą skiltyje <strong className={strong}>Nustatymai → Paskyra</strong>.
          </li>
        </Bullets>
      </Section>

      <Section id="controller" title="Kas mes">
        <p>
          Bronze valdo <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />, įmonės kodas{' '}
          <Fill value={OPERATOR.companyNumber} />. Mes sprendžiame, kaip naudojami jūsų duomenys (esame duomenų valdytojas). Klausimai apie duomenis:{' '}
          <Email value={OPERATOR.email} />. Daugiau – skiltyje <TextLink to={PATHS.legal}>Rekvizitai</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Žaidimas svečio teisėmis">
        <p>
          Svečias žaidžia prieš kompiuterį savo naršyklėje. Partija, nustatymai ir rezultatai lieka naršyklės saugykloje (žr.{' '}
          <TextLink to={PATHS.cookies}>Slapukų politiką</TextLink>). Kaip ir bet kuri svetainė, mūsų prieglobos teikėjas mato kai kuriuos techninius duomenis:
        </p>
        <DataTable caption="Visų lankytojų duomenys" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Ką saugome, kai turite paskyrą">
        <p>Saugome tik tai, ko reikia Bronze. Niekada neklausiame jūsų gimimo datos, adreso ar buvimo vietos. Aprašymas, šalis ir nuotrauka – neprivalomi.</p>
        <DataTable caption="Paskyrų turėtojų duomenys" head={HEAD} rows={dataRows(inventory.account)} />
        <p>
          „Teisinis pagrindas“ – BDAR (ES duomenų apsaugos įstatymo) nuostata, leidžianti kiekvieną naudojimą. „Sutartis“ reiškia, kad to reikia, jog
          gautumėte žaidimą, kuriam užsiregistravote.
        </p>
      </Section>

      <Section id="online" title="Žaidimas internetu">
        <Bullets>
          <li>Kiekvieną internetinės partijos ėjimą patikrina ir išsaugo mūsų serveris. Partijos žaidėjai ir viešų partijų stebėtojai mato lentą, vardus ir ėjimus. Jūsų kortų nemato niekas kitas.</li>
          <li>Baigtas partijas gali peržiūrėti jų žaidėjai, o viešas – visi.</li>
          <li>Reitinguotos partijos keičia jūsų reitingą. Jis rodomas jūsų profilyje, o nusistovėjęs (po 10 reitinguotų partijų) – ir lyderių lentelėje.</li>
          <li>Draugai mato, kada esate prisijungę, t. y. kai jūsų programėlė per paskutines 2 minutes susisiekė su mūsų serveriu.</li>
          <li>
            Kas mato jūsų profilį ir partijų istoriją, renkatės skiltyje <strong className={strong}>Paskyros nustatymai → Privatumas</strong>:{' '}
            <strong className={strong}>Viešas</strong> (visi), <strong className={strong}>Tik draugams</strong> arba <strong className={strong}>Privatus</strong> (tik
            jūs). Vartotojo vardas ir nuotrauka matomi visada, el. pašto adresas – niekada. Jaunesnių nei 18 metų žaidėjų paskyros iš pradžių matomos tik draugams.
          </li>
        </Bullets>
      </Section>

      <Section id="recipients" title="Kas dar mato jūsų duomenis">
        <p>Šios įmonės padeda mums valdyti Bronze. Jūsų duomenis jos gali naudoti tik šiam darbui mums atlikti (jos yra duomenų tvarkytojai), išskyrus „Google“.</p>
        <DataTable
          caption="Asmens duomenų gavėjai"
          head={['Kas', 'Vaidmuo', 'Kokie duomenys', 'Kur']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <p>
          „Supabase“ – JAV įmonė. Kai jūsų duomenys perduodami už Europos ekonominės erdvės ribų, juos saugo <Fill value={SERVICES.transferSafeguards} />. Galite
          paprašyti mūsų kopijos.
        </p>
      </Section>

      <Section id="rights" title="Jūsų teisės">
        <Bullets>
          <li>
            <strong className={strong}>Matyti ir pasiimti savo duomenis</strong>: <strong className={strong}>Nustatymai → Paskyra → Atsisiųsti mano duomenis</strong> duoda
            failą (JSON) su viskuo, kas išvardyta: paskyra, profiliu, rezultatais, internetinėmis partijomis su jūsų ėjimais, reitingais, draugais ir kvietimais.
          </li>
          <li>
            <strong className={strong}>Ištrinti juos</strong>: <strong className={strong}>Nustatymai → Paskyra → Ištrinti mano paskyrą</strong>. Patvirtinate įvesdami
            savo vartotojo vardą, ir viskas iš karto ištrinama. Sužaistos internetinės partijos lieka kitiems žaidėjams: jūsų vietoje rodoma „Ištrintas žaidėjas“, be
            jokio ryšio su jumis. Atsarginės kopijos perrašomos per <Fill value={SERVICES.backupRetention} />.
          </li>
          <li>
            <strong className={strong}>Ištaisyti juos</strong>: paskyros nustatymuose arba paprašę mūsų.
          </li>
          <li>
            <strong className={strong}>Prieštarauti arba prašyti apriboti</strong> tai, ką su jais darome, kai remiamės „teisėtu interesu“.
          </li>
          <li>
            <strong className={strong}>Atšaukti sutikimą</strong> (pvz., neprivalomiems laiškams) skiltyje <strong className={strong}>Nustatymai → Pranešimai</strong>.
          </li>
          <li>
            <strong className={strong}>Pateikti skundą</strong> Valstybinei duomenų apsaugos inspekcijai (L. Sapiegos g. 17, LT-10312 Vilnius, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ) arba savo šalies institucijai.
          </li>
        </Bullets>
        <p>
          Negalite prisijungti? Naudokite <TextLink to={PATHS.dataRequest}>duomenų užklausų puslapį</TextLink> arba rašykite <Email value={OPERATOR.email} />.
          Atsakome per 30 dienų. Sudėtinga užklausa gali užtrukti iki dviejų mėnesių ilgiau; tada per pirmą mėnesį pasakysime kodėl. Galime paprašyti patvirtinti
          užklausą iš paskyros el. pašto adreso, kad jūsų duomenų negautų kas nors kitas.
        </p>
      </Section>

      <Section id="emails" title="Laiškai">
        <p>
          Siunčiame laiškus, kurių reikia paskyrai: adreso patvirtinimo, slaptažodžio atkūrimo ir pranešimus, kai pasikeičia slaptažodis, el. paštas ar dviejų
          veiksnių nustatymai. Visa kita (pvz., naujienas) – tik jei įjungsite, ir niekada jaunesniems nei 18 metų. Kiekviename neprivalomame laiške yra
          atsisakymo nuoroda.
        </p>
      </Section>

      <Section id="children" title="Vaikai">
        <p>
          Paskyros skirtos {MIN_ACCOUNT_AGE} metų ir vyresniems ({MIN_ACCOUNT_AGE} metų – amžius, nuo kurio Lietuvoje galima pačiam sutikti naudotis internetinėmis
          paslaugomis). Jaunesni gali žaisti kaip svečiai. Klausiame, ar jums 14–17, ar 18+ metų, o ne gimimo datos. Sužinoję, kad paskyra priklauso jaunesniam nei{' '}
          {MIN_ACCOUNT_AGE} metų asmeniui, ją ištriname.
        </p>
      </Section>

      <Section id="security" title="Saugumas">
        <p>
          Ryšys šifruojamas (HTTPS). Slaptažodžiai ir atkūrimo kodai saugomi tik kaip maišos reikšmės, kurių niekas negali perskaityti. Kiekvienas žaidėjas mato tik
          savo privačius duomenis. Po 5 neteisingų slaptažodžių prisijungimai sustabdomi. Skiltyje <strong className={strong}>Paskyros nustatymai → Saugumas</strong>{' '}
          galite įjungti dviejų veiksnių prisijungimą, matyti paskutinius prisijungimus ir atjungti kitus įrenginius.
        </p>
      </Section>

      <Section id="changes" title="Pakeitimai">
        <p>Kai ši politika pasikeičia, pasikeičia data viršuje. Apie svarbius pakeitimus pranešame iš anksto žaidime arba el. paštu.</p>
      </Section>
    </LegalPage>
  )
}

function TermsOfService() {
  return (
    <LegalPage
      title="Paslaugų teikimo sąlygos"
      intro={
        <p>
          Tai Bronze naudojimosi taisyklės – susitarimas tarp jūsų ir <Fill value={OPERATOR.name} /> („mes“). Susikurdami paskyrą jas priimate. Svečiams taikomos tik
          dalys apie sąžiningą žaidimą ir tai, kad žaidimas teikiamas „toks, koks yra“.
        </p>
      }
    >
      <Section id="fan-made" title="Gerbėjų sukurtas žaidimas">
        <p>
          Bronze – gerbėjų sukurtas žaidimas, įkvėptas „Brass“. Jis nesusijęs su „Roxley Games“ ar „Brass“ autoriais ir jų nepatvirtintas. Bronze nemokamas: nėra ką
          pirkti ir nėra žaidimo pinigų.
        </p>
      </Section>

      <Section id="eligibility" title="Kas gali žaisti">
        <p>Prieš kompiuterį svečio teisėmis gali žaisti visi. Paskyrai ir žaidimui internetu jums turi būti bent {MIN_ACCOUNT_AGE} metų.</p>
      </Section>

      <Section id="accounts" title="Jūsų paskyra">
        <Bullets>
          <li>Vienas žmogus – viena paskyra. Naudokite el. pašto adresą, kurį skaitote, ir niekam nesakykite slaptažodžio.</li>
          <li>Atsakote už tai, kas vyksta jūsų paskyroje, nebent kas nors į ją pateko ne dėl jūsų kaltės.</li>
          <li>Paskyrą galite bet kada ištrinti skiltyje Nustatymai → Paskyra.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Vartotojo vardai">
        <p>
          Vartotojo vardą sudaro 3–20 raidžių, skaičių ir pabraukimų, ir jį mato visi. Nesirinkite vardo, kuriuo apsimetate kitu, ką nors įžeidžiate, kuris skleidžia
          neapykantą, yra seksualinio pobūdžio ar ką nors reklamuoja. Jei jūsų vardas pažeidžia šias taisykles, galime paprašyti jį pakeisti arba pakeisti patys.
        </p>
      </Section>

      <Section id="fair-play" title="Sąžiningas žaidimas">
        <p>Žaiskite sąžiningai ir būkite malonūs. Draudžiama:</p>
        <Bullets>
          <li>sukčiauti, leisti programai žaisti už jus internetinėse partijose ar laimėti pasinaudojant klaidomis (verčiau praneškite apie jas mums);</li>
          <li>tyčia palikti partijas, kad nepralaimėtumėte, arba žaisti keliomis paskyromis toje pačioje partijoje;</li>
          <li>kenkti paslaugai, kitų žaidėjų paskyroms ar mūsų serveriams;</li>
          <li>priekabiauti, grasinti ar įžeidinėti kitus žaidėjus, dalytis kuo nors neteisėtu.</li>
        </Bullets>
        <p>Žaidėjas, palikęs prasidėjusią internetinę partiją, ją pralaimi: jo vietą baigia žaisti robotas, o jis lieka paskutinis. Apie žaidėją galite pranešti jo profilyje.</p>
      </Section>

      <Section id="content" title="Žaidimas">
        <p>
          Bronze programėlė, jos piešiniai, žemėlapiai ir kodas priklauso <Fill value={OPERATOR.name} /> arba juos sukūrusiems žmonėms (žr.{' '}
          <TextLink to={PATHS.credits}>Autoriai</TextLink>). Galite žaisti savo, nekomerciniam malonumui.
        </p>
      </Section>

      <Section id="termination" title="Jei pažeidžiate taisykles">
        <p>
          Jei taisykles pažeidžiate šiurkščiai ar pakartotinai, galime sustabdyti arba uždaryti jūsų paskyrą. Jei tai nebūtų nesaugu ar neteisėta, pirmiausia
          pasakysime kodėl ir leisime atsakyti.
        </p>
      </Section>

      <Section id="disclaimers" title="Žaidimas „toks, koks yra“">
        <p>
          Bronze – ankstyva versija. Stengiamės, kad jis veiktų, o jūsų duomenys būtų saugūs, tačiau funkcijos gali keistis, žaidimas gali neveikti ar turėti klaidų.
          Reitingai ir rezultatai gali būti pataisyti, jei juos paveikė klaida ar sukčiavimas. Svečio pažanga saugoma tik jūsų naršyklėje: išvalius naršyklės
          duomenis, ji dingsta.
        </p>
      </Section>

      <Section id="liability" title="Atsakomybė">
        <p>
          Bronze nemokamas. Neatsakome už netiesioginius nuostolius ar nuostolius, kurių galėjote išvengti. Tai niekada neriboja mūsų atsakomybės už mirtį ar
          sužalojimą dėl neatsargumo, sukčiavimą, tyčia ar dėl didelio neatsargumo padarytą žalą ar kitką, ko įstatymas neleidžia riboti. Jūsų, kaip vartotojo,
          teisės nesikeičia.
        </p>
      </Section>

      <Section id="law" title="Teisė ir ginčai">
        <p>
          Šioms sąlygoms taikoma Lietuvos teisė. Jei esate ES gyvenantis vartotojas, jus vis tiek saugo jūsų šalies vartotojų teisės aktai ir galite kreiptis į
          savo šalies teismą.
        </p>
        <p>
          Pirmiausia kreipkitės į mus: <Email value={OPERATOR.email} />. Vartotojai taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), kuri padeda ginčus išspręsti ne teisme.
        </p>
      </Section>

      <Section id="changes" title="Pakeitimai">
        <p>
          Šias sąlygas galime atnaujinti, pvz., atsiradus naujoms funkcijoms. Apie svarbius pakeitimus pranešame iš anksto žaidime arba el. paštu. Jei nesutinkate,
          galite ištrinti paskyrą.
        </p>
      </Section>

      <Section id="contact" title="Kontaktai">
        <p>
          <Fill value={OPERATOR.name} />, <Fill value={OPERATOR.address} />, <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

function RefundPolicy() {
  return (
    <LegalPage
      title="Pinigų grąžinimo politika"
      intro={
        <p>
          Bronze yra nemokamas. Už tikrus pinigus nėra ką pirkti ir nėra žaidimo valiutos, kurią būtų galima pirkti ar uždirbti. Parduotuvė dar neatidaryta, tad
          nėra už ką grąžinti pinigų.
        </p>
      }
    >
      <Section id="future" title="Jei pradėsime pardavinėti">
        <p>
          Prieš ką nors parduodant, šiame puslapyje bus išdėstytos jūsų teisės, įskaitant ES 14 dienų teisę atsisakyti sutarties ir jos taikymą skaitmeniniam
          turiniui, o visa kiekvieno daikto kaina bus parodyta prieš mokant.
        </p>
      </Section>
      <Section id="contact" title="Klausimai">
        <p>
          Rašykite <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

function CookiePolicy() {
  return (
    <LegalPage
      title="Slapukų politika"
      intro={
        <p>
          Bronze naudoja vieną slapuką ir kelis įrašus jūsų naršyklės saugykloje – tik tam, ko reikia Bronze veikimui. Visi jie – pačios Bronze: niekuo
          nesidalijama su kitomis svetainėmis, nėra reklamos, analitikos ar socialinių tinklų sekiklių.
        </p>
      }
    >
      <Section id="essential" title="Tik tai, ko reikia">
        <p>
          Viskas, kas išvardyta žemiau, yra būtina: leidžia likti prisijungus, išsaugo vykstančią partiją ir įsimena jūsų nustatymus bei pasirinkimus. Tokiai
          saugyklai įstatymas jūsų sutikimo nereikalauja, todėl Bronze vieną kartą parodo pranešimą, o ne prašo sutikti ar atsisakyti.
        </p>
      </Section>

      <Section id="list" title="Viskas, ką saugo Bronze">
        <DataTable
          caption="Bronze naudojami slapukai ir saugykla"
          head={['Pavadinimas', 'Tipas', 'Teikėjas', 'Paskirtis', 'Trukmė']}
          rows={storageRows()}
        />
      </Section>

      <Section id="choices" title="Kaip tai pašalinti">
        <p>
          Viską, ką Bronze išsaugojo šioje naršyklėje, galite pašalinti skiltyje Nustatymai → Paskyra → Išvalyti šį įrenginį arba naršyklės nustatymuose. Būsite
          atjungti, o svečio pažanga dings.
        </p>
        <p>
          Daugiau apie jūsų duomenis: <TextLink to={PATHS.privacy}>Privatumo politika</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}

function LegalNotice() {
  const t = useT()
  const details: [string, string][] = [
    ['Valdytojas', OPERATOR.name],
    ['Teisinė forma', OPERATOR.legalForm],
    ['Adresas', OPERATOR.address],
    ['El. paštas', OPERATOR.email],
    ['Juridinio asmens kodas', OPERATOR.companyNumber],
    ['PVM mokėtojo kodas', OPERATOR.vatNumber],
    ['Svetainė', OPERATOR.siteUrl],
    ['Priegloba', SERVICES.hosting],
  ]
  return (
    <LegalPage title="Rekvizitai">
      <Section id="operator" title="Kas valdo Bronze">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="font-display font-bold tracking-[0.08em] text-parchment-100 uppercase">{term}</dt>
              <dd className="mb-2 sm:mb-0">{value === OPERATOR.email ? <Email value={value} /> : <Fill value={value} />}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-parchment-300">Jei valdytojas nėra PVM mokėtojas, PVM eilutę galima pašalinti. Praleiskite netaikomas eilutes.</p>
      </Section>

      <Section id="documents" title="Teisiniai puslapiai">
        <DocumentLinks credits="Autoriai ir licencijos" label={(key) => t.nav[key]} />
      </Section>
    </LegalPage>
  )
}

function Credits() {
  return (
    <LegalPage
      ornate
      title="Autoriai"
      intro={
        <p>
          Bronze – originalus pramonės eros strateginis žaidimas, kurį sukūrė <Fill value={OPERATOR.name} />. Jis remiasi kitų darbu, nurodytu žemiau.
        </p>
      }
    >
      <Section id="fonts" title="Šriftai">
        <DataTable
          caption="Šriftai"
          head={['Šriftas', 'Autorius', 'Licencija']}
          rows={[
            ['Cinzel', 'Copyright 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel)', fileLink('licenses/OFL-cinzel.txt', 'SIL Open Font License 1.1')],
            ['Barlow', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow.txt', 'SIL Open Font License 1.1')],
            ['Barlow Condensed', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow-condensed.txt', 'SIL Open Font License 1.1')],
          ]}
        />
        <p className="text-sm">Šriftai pateikiami iš pačios Bronze failų (supakuoti „Fontsource“), o ne įkeliami iš „Google“ ar kito serverio.</p>
      </Section>

      <Section id="art" title="Iliustracijos ir garsas">
        <DataTable
          caption="Iliustracijos ir garsas"
          head={['Kas', 'Kas sukūrė']}
          rows={[
            [
              'Nupieštas žemėlapis, pramonės piktogramos, trasų tekstūros, jungčių žetonai ir šešiakampiai, prekybos mazgų paveikslėliai, laukiamojo skydeliai ir žalvariniai mygtukai',
              <>
                <Fill value={OPERATOR.name} />, naudojant dirbtinio intelekto vaizdų kūrimo įrankius
              </>,
            ],
            ['Foniniai paveikslai', 'Sukurti Bronze dirbtiniu intelektu'],
            ['Logotipas ir ornamentai', 'Sukurti Bronze'],
            ['Sąsajos piktogramos', 'Nupieštos Bronze'],
            ['„G“ ant prisijungimo mygtuko', '„Google“ logotipas, „Google LLC“ prekių ženklas, naudojamas ant prisijungimo mygtuko, kaip prašoma „Google“ prisijungimo gairėse'],
            ['Garso efektai ir muzika', 'Kuriami jūsų naršyklėje žaidžiant („Web Audio“): jokių įrašų'],
          ]}
        />
      </Section>

      <Section id="software" title="Programinė įranga">
        <p>
          Bronze sukurtas naudojant „React“, „React Router“, „Supabase“ „JavaScript“ klientą, „Tailwind CSS“ ir „Vite“ (visi – MIT licencija) bei kelis
          mažesnius atvirojo kodo paketus. Visas sąrašas su visais licencijų tekstais: {fileLink('THIRD_PARTY_NOTICES.txt', 'Trečiųjų šalių pranešimai')} (anglų
          kalba).
        </p>
      </Section>
    </LegalPage>
  )
}

const legal: LegalText = {
  inventory,
  PrivacyPolicy,
  TermsOfService,
  RefundPolicy,
  CookiePolicy,
  LegalNotice,
  Credits,
  dataRequest: {
    title: 'Duomenų užklausos',
    intro: (
      <p>
        Jei galite prisijungti, greičiausia tai padaryti žaidime: skiltyje Nustatymai → Paskyra yra <strong>Atsisiųsti mano duomenis</strong> ir{' '}
        <strong>Ištrinti mano paskyrą</strong>. Jei prisijungti negalite, kreipkitės čia.
      </p>
    ),
    howTitle: 'Kaip tai veikia',
    how: [
      'Atsakome per 30 dienų (vieną mėnesį). Sudėtingų prašymų atveju terminas gali būti pratęstas dviem mėnesiais; apie tai pranešime per pirmąjį mėnesį.',
      'Kad apsaugotume jūsų paskyrą, atsakysime paskyros el. pašto adresu ir galime paprašyti prašymą iš jo patvirtinti.',
    ],
    rights: (policy) => <>Jūsų teisės paaiškintos puslapyje „{policy}“.</>,
    formTitle: 'Pateikti užklausą',
    formIntro: (email) => <>Ši forma parengia laišką, kurį išsiųsite iš savo el. pašto programos adresu {email}. Kol jo neišsiųsite, niekas neišsiunčiama.</>,
    noAddress: 'Valdytojo el. pašto adresas dar neįrašytas, todėl šios formos išsiųsti negalima.',
    what: 'Ko norėtumėte?',
    requests: {
      access: 'Mano duomenų kopijos (susipažinimas / perkeliamumas)',
      erasure: 'Ištrinti mano paskyrą ir duomenis',
      rectification: 'Ištaisyti mano duomenis',
      objection: 'Nesutikti su tvarkymu arba jį apriboti',
      other: 'Kita',
    },
    email: 'Jūsų paskyros el. pašto adresas',
    emailError: 'Įveskite savo Bronze paskyros el. pašto adresą, kad galėtume ją rasti ir atsakyti.',
    username: 'Vartotojo vardas (nebūtina)',
    details: 'Išsami informacija (nebūtina)',
    submit: 'Parengti laišką',
    subject: (request) => `Bronze duomenų užklausa: ${request}`,
    body: (request, email, username, details) => [`Užklausa: ${request}`, `Paskyros el. paštas: ${email}`, `Vartotojo vardas: ${username}`, '', details].join('\n'),
    notGiven: '(nenurodyta)',
  },
  unsubscribe: {
    title: 'Atsisakyti prenumeratos',
    lists: { marketing: 'Bronze naujienų', friends: 'draugų laiškų', tournaments: 'turnyrų laiškų', all: 'jokių nebūtinų laiškų' },
    done: 'Prenumeratos atsisakyta',
    working: 'Atsisakoma…',
    failed: 'Nepavyko atsisakyti',
    doneBody: (list) => `Nebegausite ${list}. Jau siunčiami laiškai gali ateiti dar kelias minutes.`,
    workingBody: 'Akimirką…',
    notFoundBody: 'Ši atsisakymo nuoroda netinkama. Galbūt ji nukopijuota ne visa.',
    failedBody: 'Kažkas nepavyko. Pabandykite nuorodą dar kartą po minutės.',
    unavailableBody: 'Šioje svetainėje paskyros neįdiegtos, todėl nėra laiškų, kurių būtų galima atsisakyti.',
    more: (l) => <>Prisijungę visus el. laiškų pasirinkimus galite pakeisti skiltyje Nustatymai → Pranešimai. Klausimai: {l}.</>,
    dataRequests: 'duomenų užklausos',
  },
}

export default legal
