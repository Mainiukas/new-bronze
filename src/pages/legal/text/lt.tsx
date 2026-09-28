/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, Sub, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
import { consentStore } from '../../../legal/consent'
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
      purpose: 'Įsimena jūsų slapukų pasirinkimus, jų datą ir politikos versiją, kuriai juos pasirinkote.',
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
    'bronze.boardDraft': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Neišsaugoti žemėlapio redaktoriaus pakeitimai (#/board?edit=1). Sukuriama, tik jei naudojate redaktorių.',
      duration: 'Kol juos atkursite',
    },
    'bronze.settings': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Jūsų nustatymai: kalba, garsas, garsumas, animacijos ir kompiuterio greitis, ėjimo laikmatis, partijos žurnalas.',
      duration: 'Kol išvalysite arba atšauksite sutikimą',
    },
    'bronze.lobby.gameMode': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Paskutinis jūsų pasirinktas žaidimo režimas.',
      duration: 'Kol išvalysite arba atšauksite sutikimą',
    },
    'bronze.lobby.map': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Paskutinis jūsų pasirinktas žemėlapis.',
      duration: 'Kol išvalysite arba atšauksite sutikimą',
    },
    'bronze.setup': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Paskutinį kartą nustatytos partijos vietos: vardai, spalvos ir kompiuterio lygiai.',
      duration: 'Kol išvalysite arba atšauksite sutikimą',
    },
    'bronze.stats': {
      where: 'Vietinė saugykla',
      provider: 'Bronze',
      purpose: 'Jūsų rezultatai ir pasiekimai žaidžiant kaip svečias (prisijungus perkeliami į paskyrą).',
      duration: 'Kol išvalysite, atšauksite sutikimą arba prisijungsite',
    },
  },
  categories: [
    { id: 'essential', title: 'Būtinieji', description: 'Leidžia likti prisijungus, išsaugo vykstančią partiją ir įsimena jūsų slapukų pasirinkimus. Visada įjungti.' },
    { id: 'preferences', title: 'Nuostatos', description: 'Šiame įrenginyje įsimena jūsų nustatymus, paskutinį žaidimo režimą, žemėlapį, vietas ir svečio rezultatus.' },
    { id: 'analytics', title: 'Analitika', description: 'Šiuo metu Bronze analitikos nenaudoja. Jei kada nors naudos, ji veiks tik tai įjungus.' },
    { id: 'marketing', title: 'Rinkodara', description: 'Šiuo metu Bronze nenaudoja reklamos ar rinkodaros sekiklių. Jei kada nors naudos, jie veiks tik tai įjungus.' },
  ],
  account: [
    {
      what: 'El. pašto adresas',
      why: 'Kad galėtumėte prisijungti, ir paskyros laiškams (adreso patvirtinimui, slaptažodžio atkūrimui).',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    { what: 'Slaptažodis', why: 'Kad galėtumėte prisijungti. „Supabase“ saugo tik vienkryptę maišos reikšmę; niekas negali jo perskaityti.', basis: CONTRACT, retention: UNTIL_DELETED },
    { what: 'Vartotojo vardas', why: 'Jūsų vardas žaidime. Jį mato kiti žaidėjai.', basis: CONTRACT, retention: UNTIL_DELETED },
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
      why: 'Jūsų profilis ir pasiekimai. Kiti prisijungę žaidėjai mato jūsų rezultatus. ID užtikrina, kad du kartus išsiųstas rezultatas būtų įskaitytas vieną kartą.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Nesėkmingų prisijungimų skaitiklis: bandytas vartotojo vardas, kiek neteisingų slaptažodžių ir kada',
      why: 'Kad po 5 neteisingų slaptažodžių prisijungimai būtų sustabdyti 30 sekundžių, apsaugant nuo slaptažodžių spėliojimo.',
      basis: 'Teisėtas interesas užtikrinti saugumą (BDAR 6 str. 1 d. f p.)',
      retention: 'Išvaloma sėkmingai prisijungus; kitu atveju ištrinama po paros',
    },
    {
      what: '„Supabase“ saugomi prisijungimo įvykiai (laikas, IP adresas, naršyklė)',
      why: 'Prisijungimo paslaugos saugumas.',
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
    { name: 'Kiti žaidėjai', role: 'Mato jūsų viešą profilį', data: 'Vartotojo vardas, avataras, žaidimo rezultatai, prisijungimo data', location: 'Visur, kur žaidžiama Bronze' },
  ],
}

const HEAD = ['Kas', 'Kodėl', 'Teisinis pagrindas', 'Kiek laiko']
const dataRows = (items: DataItem[]) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privatumo politika"
      intro={
        <p>
          Bronze – strateginis žaidimas, kurį galite žaisti naršyklėje. Žaisti kaip svečias galite nieko apie save nepateikę. Ši politika paaiškina, ką
          tvarkome, kai susikuriate paskyrą, kodėl, ir kokias teises turite.
        </p>
      }
    >
      <Section id="controller" title="Kas mes esame">
        <p>
          Jūsų asmens duomenų valdytojas yra <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />. Juridinio
          asmens kodas <Fill value={OPERATOR.companyNumber} />. Visais su duomenimis susijusiais klausimais rašykite <Email value={OPERATOR.email} />. Taip pat
          žr. mūsų <TextLink to={PATHS.legal}>rekvizitus</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Žaidimas kaip svečias">
        <p>
          Žaidžiant kaip svečias, mums apie jus nieko neperduodama. Partijos žaidžiamos jūsų naršyklėje, o tai, ką Bronze įsimena (vykstanti partija ir, jei
          leidžiate, nustatymai bei rezultatai), lieka naršyklės saugykloje. Visas sąrašas pateiktas <TextLink to={PATHS.cookies}>Slapukų politikoje</TextLink>.
          Mūsų prieglobos paslaugų teikėjas vis tiek mato techninius duomenis, kuriuos gauna kiekviena svetainė:
        </p>
        <DataTable caption="Kiekvieno lankytojo tvarkomi duomenys" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Turint paskyrą">
        <p>
          Paskyra nebūtina. Ji leidžia išsaugoti rezultatus ir pasiekimus skirtinguose įrenginiuose, o atsiradus žaidimui internetu jos reikės jam. Renkame tik tai,
          ko reikia paskyrai: jokio telefono numerio, gimimo datos ar buvimo vietos.
        </p>
        <DataTable caption="Paskyrų turėtojų tvarkomi duomenys" head={HEAD} rows={dataRows(inventory.account)} />
        <p>
          Ištrynus paskyrą, visa tai iš karto ištrinama. Kopijos gali likti duomenų bazės atsarginėse kopijose iki <Fill value={SERVICES.backupRetention} />, kol
          bus perrašytos. Jei pradedate jungtis per „Google“, bet paskyros nesukuriate, pasirinkus „Ne dabar“ ji ištrinama iš karto; kitu atveju nebaigta
          registracija ištrinama po 7 dienų. Taip pat ištrinama ir niekada nepatvirtinta registracija el. paštu.
        </p>
        <p>
          Neparduodame jūsų duomenų, nerodome reklamos, neprofiliuojame jūsų ir nepriimame apie jus automatizuotų sprendimų. Bronze nenaudoja analitikos ar
          sekimo įrankių.
        </p>
      </Section>

      <Section id="emails" title="El. laiškai">
        <p>
          Siunčiame jums reikalingus paskyros laiškus: adreso patvirtinimo ir slaptažodžio atkūrimo. Juose nieko kito nėra. Naujienas ar kitus nebūtinus laiškus
          siųstume tik jums juos įjungus ir niekada jaunesniems nei 18 metų. Bronze kol kas nebūtinų laiškų nesiunčia. Kiekviename nebūtiname laiške bus
          atsisakymo vienu spustelėjimu nuoroda, o pasirinkimus galite bet kada pakeisti skiltyje Nustatymai → Pranešimai.
        </p>
      </Section>

      <Section id="recipients" title="Kas dar tvarko jūsų duomenis">
        <DataTable
          caption="Asmens duomenų gavėjai"
          head={['Kas', 'Vaidmuo', 'Kokie duomenys', 'Kur']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <Sub title="Perdavimas už EEE ribų">
          <p>
            „Supabase, Inc.“ įsikūrusi Jungtinėse Valstijose. Jūsų paskyros duomenys saugomi aukščiau nurodytame projekto regione; jei jie pasiekiami ar
            perduodami už Europos ekonominės erdvės ribų, juos saugo <Fill value={SERVICES.transferSafeguards} />. Galite paprašyti šių apsaugos priemonių
            kopijos.
          </p>
        </Sub>
      </Section>

      <Section id="rights" title="Jūsų teisės">
        <p>Pagal BDAR jūs galite:</p>
        <Bullets>
          <li>
            <strong className={strong}>susipažinti</strong> su savo duomenimis ir <strong className={strong}>juos perkelti</strong>: Nustatymai → Paskyra →
            Atsisiųsti mano duomenis pateikia jų kopiją failu;
          </li>
          <li>
            <strong className={strong}>juos ištaisyti</strong>: parašykite mums arba pakeiskite nustatymus žaidime;
          </li>
          <li>
            <strong className={strong}>juos ištrinti</strong>: Nustatymai → Paskyra → Ištrinti mano paskyrą;
          </li>
          <li>
            <strong className={strong}>nesutikti</strong> su tvarkymu teisėto intereso pagrindu arba prašyti jį <strong className={strong}>apriboti</strong>;
          </li>
          <li>
            bet kada <strong className={strong}>atšaukti sutikimą</strong>, nepaveikdami ankstesnio tvarkymo: Slapukų nustatymai (poraštėje) ir Nustatymai →
            Pranešimai;
          </li>
          <li>
            <strong className={strong}>pateikti skundą</strong> Valstybinei duomenų apsaugos inspekcijai (L. Sapiegos g. 17, LT-10312 Vilnius, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ) arba savo gyvenamosios vietos priežiūros institucijai.
          </li>
        </Bullets>
        <p>
          Jei negalite prisijungti, naudokitės <TextLink to={PATHS.dataRequest}>duomenų užklausų puslapiu</TextLink> arba rašykite <Email value={OPERATOR.email} />.
          Atsakome per 30 dienų (vieną mėnesį). Sudėtingų prašymų atveju šį terminą galime pratęsti dar iki dviejų mėnesių ir per pirmąjį mėnesį nurodysime
          priežastį. Galime paprašyti patvirtinti prašymą iš paskyros el. pašto adreso, kad niekas kitas negautų jūsų duomenų.
        </p>
      </Section>

      <Section id="children" title="Vaikai">
        <p>
          Paskyros skirtos tik {MIN_ACCOUNT_AGE} metų ir vyresniems asmenims ({MIN_ACCOUNT_AGE} metų – amžius, nuo kurio Lietuvoje asmuo pagal BDAR 8 straipsnį
          gali pats sutikti su informacinės visuomenės paslaugomis). Jaunesni žaidėjai gali žaisti kaip svečiai – tuomet apie juos pas mus nieko nesaugoma.
          Registruojantis klausiame, ar jums 14–17, ar 18 ir daugiau metų; gimimo datos neklausiame. Jaunesniems nei 18 metų rinkodaros niekada nesiunčiame, o
          bet kokiam pirkiniui jiems reikia tėvų ar globėjų leidimo (šiuo metu Bronze nieko neparduoda). Sužinoję, kad paskyra priklauso jaunesniam nei{' '}
          {MIN_ACCOUNT_AGE} metų asmeniui, ją ištriname.
        </p>
      </Section>

      <Section id="security" title="Saugumas">
        <p>
          Ryšiai šifruojami (HTTPS). Slaptažodžiai saugomi tik kaip maišos reikšmės. Kiekvienas žaidėjas gali skaityti ir keisti tik savo privačius duomenis; po 5
          neteisingų slaptažodžių to vartotojo vardo prisijungimai sustabdomi 30 sekundžių.
        </p>
      </Section>

      <Section id="changes" title="Šios politikos pakeitimai">
        <p>Pakeitę šią politiką, atnaujiname viršuje nurodytą datą. Apie svarbius pakeitimus pranešime prieš jiems įsigaliojant – žaidime arba el. paštu.</p>
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
          Šios sąlygos yra jūsų ir <Fill value={OPERATOR.name} /> („mes“) susitarimas dėl naudojimosi Bronze. Susikurdami paskyrą, jas priimate. Žaidžiant kaip
          svečias taikomos tik dalys apie sąžiningą žaidimą ir apie tai, kad žaidimas teikiamas toks, koks yra.
        </p>
      }
    >
      <Section id="eligibility" title="Kas gali žaisti">
        <p>
          Kaip svečias gali žaisti bet kas. Paskyrai susikurti turite būti ne jaunesni nei {MIN_ACCOUNT_AGE} metų. Jei jums nėra 18 metų, prieš ką nors
          perkant turi sutikti tėvai ar globėjai (šiuo metu Bronze nieko neparduoda).
        </p>
      </Section>

      <Section id="accounts" title="Jūsų paskyra">
        <Bullets>
          <li>Vienas asmuo – viena paskyra. Nurodykite tikrą el. pašto adresą, kurį pasiekiate, ir niekam neatskleiskite slaptažodžio.</li>
          <li>Atsakote už tai, kas vyksta jūsų paskyroje, nebent kas nors į ją pateko ne dėl jūsų kaltės.</li>
          <li>Paskyrą galite ištrinti bet kada: Nustatymai → Paskyra.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Vartotojo vardai">
        <p>
          Vartotojo vardą sudaro 3–20 raidžių, skaičių ir pabraukimo ženklų, ir jį mato kiti žaidėjai. Nesirinkite vardo, kuriuo apsimetama kitu asmeniu,
          įžeidžiama ar priekabiaujama, kuris kursto neapykantą, yra seksualinio pobūdžio ar ką nors reklamuoja. Galime paprašyti pakeisti šias taisykles
          pažeidžiantį vardą arba, jei to nepadarysite, pakeisti jį patys.
        </p>
      </Section>

      <Section id="fair-play" title="Sąžiningas žaidimas">
        <p>Žaiskite taip, kaip žaidimas sumanytas. Draudžiama:</p>
        <Bullets>
          <li>sukčiauti, naudoti už jus žaidžiančius robotus ar scenarijus arba išnaudoti klaidas (verčiau praneškite apie jas mums);</li>
          <li>trukdyti paslaugai, kitų žaidėjų paskyroms ar serveriams;</li>
          <li>priekabiauti, grasinti ar įžeidinėti kitus žaidėjus arba platinti ką nors neteisėto.</li>
        </Bullets>
      </Section>

      <Section id="virtual-items" title="Virtualūs daiktai ir valiuta">
        <p>
          Šiuo metu Bronze neturi virtualių daiktų ar žaidimo valiutos. Jei vėliau jų atsirastų: tai licencija juos naudoti Bronze, o ne nuosavybė; jie neturi
          realios vertės, jų negalima iškeisti į pinigus, parduoti ar perduoti kitai paskyrai. Tai neturi įtakos jūsų, kaip vartotojo, teisėms į tai, už ką
          sumokėjote (žr. <TextLink to={PATHS.refunds}>Pinigų grąžinimo politiką</TextLink>).
        </p>
      </Section>

      <Section id="content" title="Žaidimas ir jo turinys">
        <p>
          Bronze, jo iliustracijos, žemėlapiai ir kodas priklauso <Fill value={OPERATOR.name} /> arba jo licencijų davėjams (žr.{' '}
          <TextLink to={PATHS.credits}>Autorius</TextLink>). Galite jį žaisti savo asmeniniam, nekomerciniam naudojimui.
        </p>
      </Section>

      <Section id="termination" title="Paskyrų sustabdymas ir uždarymas">
        <p>
          Jei šias sąlygas pažeidžiate šiurkščiai ar pakartotinai, galime sustabdyti ar uždaryti jūsų paskyrą. Nebent tai būtų nesaugu ar neteisėta, pirma
          pranešime priežastį ir suteiksime galimybę atsakyti. Savo paskyrą galite uždaryti bet kada.
        </p>
      </Section>

      <Section id="disclaimers" title="Prieinamumas">
        <p>
          Bronze – ankstyva versija. Stengiamės, kad jis veiktų, o jūsų duomenys būtų saugūs, tačiau funkcijos gali keistis, paslauga gali būti nepasiekiama
          ar turėti klaidų. Svečio pažanga saugoma tik jūsų naršyklėje: išvalius naršyklės duomenis, ji dingsta.
        </p>
      </Section>

      <Section id="liability" title="Atsakomybė">
        <p>
          Bronze yra nemokamas. Neatsakome už netiesioginius nuostolius ar nuostolius, kurių galėjote išvengti. Niekas šiose sąlygose neriboja atsakomybės už
          dėl neatsargumo sukeltą mirtį ar sveikatos sužalojimą, už sukčiavimą, už tyčia ar dėl didelio neatsargumo padarytą žalą ar jokios kitos atsakomybės,
          kurios įstatymas neleidžia riboti. Jūsų, kaip vartotojo, įstatyminės teisės nepaveikiamos.
        </p>
      </Section>

      <Section id="law" title="Taikytina teisė ir ginčai">
        <p>
          Šioms sąlygoms taikoma Lietuvos Respublikos teisė. Jei esate ES gyvenantis vartotojas, jums taip pat išlieka savo gyvenamosios šalies imperatyviųjų
          vartotojų apsaugos normų apsauga ir galite kreiptis į tos šalies teismus.
        </p>
        <p>
          Pirmiausia kreipkitės į mus adresu <Email value={OPERATOR.email} />. Vartotojai taip pat gali kreiptis į Valstybinę vartotojų teisių apsaugos tarnybą (
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), kuri vartotojų ginčus sprendžia ne teismo tvarka.
        </p>
      </Section>

      <Section id="changes" title="Šių sąlygų pakeitimai">
        <p>
          Šias sąlygas galime atnaujinti, pavyzdžiui, atsiradus naujoms funkcijoms. Apie svarbius pakeitimus pranešime prieš jiems įsigaliojant – žaidime arba el.
          paštu. Jei nesutinkate, galite ištrinti paskyrą; kitu atveju naujos sąlygos taikomos nuo jų datos.
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
  const title = (id: string) => inventory.categories.find((c) => c.id === id)!.title
  return (
    <LegalPage
      title="Slapukų politika"
      intro={
        <p>
          Bronze naudoja vieną slapuką ir kelis įrašus jūsų naršyklės vietinėje ir sesijos saugykloje. Visi jie – pačios Bronze: niekas nėra dalijamasi su kitomis
          svetainėmis, nėra reklamos, analitikos ar socialinių tinklų sekiklių.
        </p>
      }
    >
      <Section id="categories" title="Kategorijos">
        <Bullets>
          {inventory.categories.map((c) => (
            <li key={c.id}>
              <strong className={strong}>{c.title}.</strong> {c.description}
            </li>
          ))}
        </Bullets>
        <p>
          Būtinoji saugykla reikalinga tam, ko prašote Bronze, todėl jūsų sutikimo jai nereikia. Visa kita laukia jūsų sutikimo: kol neleisite Nuostatų, jūsų
          nustatymai galios tik iki puslapio uždarymo.
        </p>
      </Section>

      <Section id="list" title="Viskas, ką saugo Bronze">
        <DataTable
          caption="Bronze naudojami slapukai ir saugykla"
          head={['Pavadinimas', 'Tipas', 'Teikėjas', 'Paskirtis', 'Kategorija', 'Trukmė']}
          rows={STORAGE_ITEMS.map((item) => {
            const text = inventory.storage[item.key]
            return [
              <code key="k" className="font-mono text-[0.85em] break-all">
                {item.key}
              </code>,
              text?.where ?? item.where,
              text?.provider ?? item.provider,
              text?.purpose ?? item.purpose,
              title(item.category),
              text?.duration ?? item.duration,
            ]
          })}
        />
      </Section>

      <Section id="choices" title="Jūsų pasirinkimai">
        <p>
          Pasirinkimus galite bet kada pakeisti per{' '}
          <button type="button" onClick={() => consentStore.reopen()} className={link}>
            Slapukų nustatymus
          </button>{' '}
          (jie yra ir kiekvieno puslapio poraštėje). Išjungus kategoriją, ištrinama tai, ką ji išsaugojo. Viską, ką Bronze išsaugojo, taip pat galite išvalyti
          skiltyje Nustatymai → Paskyra arba naršyklėje. Vėl klausiame po 12 mėnesių arba anksčiau, jei ši politika pasikeičia.
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
