/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, Sub, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
import { consentStore } from '../../../legal/consent'
import { STORAGE_ITEMS, type DataItem } from '../../../legal/inventory'
import { MIN_ACCOUNT_AGE, OPERATOR, SERVICES } from '../../../legal/operator'
import { DocumentLinks, fileLink, linkClass as link, strongClass as strong } from './shared'
import type { InventoryText, LegalText } from './types'

/* Die Rechtstexte auf Deutsch. Eine Übersetzung; bei Abweichungen gilt der englische Text. */

const UNTIL_DELETED = 'Bis Sie Ihr Konto löschen'
const CONTRACT = 'Vertrag (Art. 6 Abs. 1 lit. b DSGVO)'
const SECURITY = 'Berechtigtes Interesse an Sicherheit (Art. 6 Abs. 1 lit. f DSGVO)'
const LOCAL = 'Lokaler Speicher'
const SESSION = 'Sitzungsspeicher'
const LIBRARY = 'Bronze (Supabase-Anmeldebibliothek)'
const UNTIL_CLEARED = 'Bis Sie ihn löschen oder die Einwilligung widerrufen'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Speichert Ihre Cookie-Auswahl, wann Sie sie getroffen haben und für welche Version der Richtlinie.',
      duration: '12 Monate oder bis sich die Richtlinie ändert',
    },
    'bronze.auth': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Hält Sie angemeldet: Ihre Sitzungsschlüssel und grundlegende Kontodaten (Konto-ID, E-Mail-Adresse).',
      duration: 'Bis Sie sich abmelden; ohne „Angemeldet bleiben“ bis Sie den Browser schließen',
    },
    'bronze.auth-code-verifier': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Ein Einmal-Geheimnis, das die Anmeldung mit Google oder per E-Mail-Link sicher abschließt.',
      duration: 'Wird nach Gebrauch entfernt',
    },
    'bronze.auth-user': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Kontodaten, die manche Versionen der Anmeldebibliothek neben der Sitzung ablegen.',
      duration: 'Bis Sie sich abmelden',
    },
    'bronze.auth.remember': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Ob Sie bei der Anmeldung „Angemeldet bleiben“ gewählt haben.',
      duration: 'Bis zur nächsten Anmeldung',
    },
    bronze_session_alive: {
      where: 'Cookie',
      provider: 'Bronze',
      purpose: 'Zeigt Bronze, dass der Browser geschlossen wurde, damit eine Anmeldung ohne „Angemeldet bleiben“ endet. Enthält nur den Wert 1.',
      duration: 'Bis Sie den Browser schließen (Sitzungs-Cookie)',
    },
    'bronze.auth.returnTo': {
      where: SESSION,
      provider: 'Bronze',
      purpose: 'Die Seite, zu der Sie nach der Anmeldung mit Google zurückkehren.',
      duration: 'Nur dieser Tab; wird nach der Anmeldung entfernt',
    },
    'bronze.auth.failures': {
      where: SESSION,
      provider: 'Bronze',
      purpose: 'Zählt falsche Passwörter, damit Anmeldungen nach 5 Fehlversuchen 30 Sekunden pausieren (Sicherheit).',
      duration: 'Nur dieser Tab',
    },
    'bronze.match': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Ihre laufende Partie, damit „Fortsetzen“ dort weitermacht, wo Sie aufgehört haben.',
      duration: 'Bis die Partie endet oder Sie sie abbrechen',
    },
    'bronze.stats.pending.<id>': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Die beendeten Partien Ihres Kontos (und Ihre Gast-Statistik), bis der Server jede als gespeichert bestätigt, damit bei Verbindungsabbruch nichts verloren geht.',
      duration: 'Wird nach dem Speichern entfernt',
    },
    'bronze.boardDraft.v2': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Nicht gespeicherte Änderungen im Karteneditor (#/board?edit=1). Wird nur angelegt, wenn Sie den Editor nutzen.',
      duration: 'Bis Sie sie zurücksetzen',
    },
    'bronze.settings': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Ihre Einstellungen: Sprache, Ton, Lautstärke, Animations- und Computergeschwindigkeit, Zugtimer, Partieprotokoll.',
      duration: UNTIL_CLEARED,
    },
    'bronze.lobby.gameMode': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Der zuletzt gewählte Spielmodus.',
      duration: UNTIL_CLEARED,
    },
    'bronze.lobby.map': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Die zuletzt gewählte Karte.',
      duration: UNTIL_CLEARED,
    },
    'bronze.setup': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Die zuletzt eingerichteten Plätze: Namen, Farben und Computerstufen.',
      duration: UNTIL_CLEARED,
    },
    'bronze.stats': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Ihre Statistik und Erfolge als Gast (werden bei der Anmeldung in Ihr Konto übernommen).',
      duration: 'Bis Sie sie löschen, die Einwilligung widerrufen oder sich anmelden',
    },
  },
  categories: [
    { id: 'essential', title: 'Notwendig', description: 'Hält Sie angemeldet, speichert Ihre laufende Partie und merkt sich Ihre Cookie-Auswahl. Immer aktiv.' },
    {
      id: 'preferences',
      title: 'Präferenzen',
      description: 'Merkt sich auf diesem Gerät Ihre Einstellungen, den letzten Spielmodus, die Karte, die Plätze und Ihre Gast-Statistik.',
    },
    { id: 'analytics', title: 'Analyse', description: 'Bronze nutzt derzeit keine Analyse. Falls sich das ändert, läuft sie nur, wenn Sie sie einschalten.' },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Bronze nutzt derzeit keine Werbe- oder Marketing-Tracker. Falls sich das ändert, laufen sie nur, wenn Sie sie einschalten.',
    },
  ],
  account: [
    {
      what: 'E-Mail-Adresse',
      why: 'Damit Sie sich anmelden können, und für Konto-E-Mails (Adressbestätigung, Passwort zurücksetzen, Sicherheitshinweise, wenn sich Ihr Passwort, Ihre E-Mail-Adresse oder Ihre Zwei-Faktor-Einstellungen ändern).',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Passwort',
      why: 'Damit Sie sich anmelden können. Supabase speichert nur einen Einweg-Hash; niemand kann es lesen.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    { what: 'Benutzername', why: 'Ihr Name im Spiel. Jeder kann ihn sehen, unabhängig von Ihren Privatsphäre-Einstellungen.', basis: CONTRACT, retention: UNTIL_DELETED },
    {
      what: 'Frühere Benutzernamen und wann Sie sie geändert haben',
      why: 'Damit Links auf Ihren alten Namen 30 Tage lang zu Ihrem Profil führen und niemand anderes ihn in dieser Zeit übernehmen (und sich als Sie ausgeben) kann.',
      basis: 'Berechtigtes Interesse, Identitätsmissbrauch zu verhindern (Art. 6 Abs. 1 lit. f DSGVO)',
      retention: '30 Tage',
    },
    {
      what: 'Profilangaben, die Sie selbst hinzufügen: Kurzbeschreibung, Land, Avatar (eine Vorlage oder ein hochgeladenes Bild); und Ihre Privatsphäre-Einstellungen',
      why: 'Werden auf Ihrem Profil angezeigt, für die Personen, die Ihre Privatsphäre-Einstellungen zulassen.',
      basis: CONTRACT,
      retention: 'Bis Sie sie ändern oder Ihr Konto löschen',
    },
    {
      what: 'Google-Kontodaten (Name, E-Mail-Adresse, Profilbild, Google-Konto-ID), nur bei Anmeldung mit Google',
      why: 'Für die Anmeldung mit Google. Der Name schlägt einen Benutzernamen vor; das Bild ist Ihr Avatar, den andere Spieler sehen.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Altersbestätigung: ob Sie 14–17 oder 18+ sind (kein Geburtsdatum)',
      why: 'Konten gibt es erst ab 14 Jahren; wer unter 18 ist, erhält keine Marketing-E-Mails.',
      basis: 'Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c, Art. 8 DSGVO)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Einwilligungsnachweise: wozu Sie zugestimmt haben (Bedingungen, Datenschutzerklärung, Marketing-E-Mails), Version und Zeitpunkt',
      why: 'Damit wir nachweisen können, wozu Sie zugestimmt haben, wie es das Gesetz verlangt.',
      basis: 'Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c, Art. 7 Abs. 1 DSGVO)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'E-Mail-Einstellungen (Marketing-, Freundes- und Turnier-E-Mails; alle aus, bis Sie sie einschalten)',
      why: 'Damit wir nur die E-Mails senden, die Sie möchten, und Sie sich mit einem Klick abmelden können.',
      basis: 'Einwilligung für Marketing (Art. 6 Abs. 1 lit. a DSGVO); Vertrag für die übrigen (lit. b)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Spielstatistik: Partien, Siege, Bestwert, gelieferte Waren, gespielte Karten, Erfolge und wann sie freigeschaltet wurden, Beitrittsdatum; eine zufällige ID für jedes gespeicherte Ergebnis',
      why: 'Ihr Profil und Ihre Erfolge, sichtbar für die Personen, die Ihre Privatsphäre-Einstellungen zulassen. Die IDs sorgen dafür, dass ein doppelt gesendetes Ergebnis nur einmal zählt.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Partieverlauf: für jede beendete Partie Zeitpunkt, Karte und Spielmodus, Spielerzahl, Ihre Platzierung, Punkte, gelieferte Waren, gebaute Verbindungen und Industrien',
      why: 'Ihre letzten Partien und Statistiken auf Ihrem Profil, sichtbar für die Personen, die Ihre Privatsphäre-Einstellungen zulassen.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Zwei-Faktor-Authentifizierung, nur wenn Sie sie einschalten: der Schlüssel der Authenticator-App (bei Supabase gespeichert) und Ihre Wiederherstellungscodes (nur als Einweg-Hashes gespeichert)',
      why: 'Damit bei der Anmeldung ein Code von Ihrem Telefon verlangt wird und Sie mit einem Wiederherstellungscode hineinkommen, falls Sie es verlieren.',
      basis: CONTRACT,
      retention: 'Bis Sie sie ausschalten oder Ihr Konto löschen',
    },
    {
      what: 'Meldungen: wenn Sie einen Spieler melden oder ein Spieler Sie meldet: wer, der Grund, die Notiz und wann',
      why: 'Um Schummeln, anstößige Namen, Belästigung und Spam zu prüfen und das Spiel fair und sicher zu halten.',
      basis: 'Berechtigtes Interesse an einem sicheren Spiel (Art. 6 Abs. 1 lit. f DSGVO)',
      retention: '12 Monate; früher, wenn das gemeldete Konto gelöscht wird',
    },
    {
      what: 'Missbrauchszähler: Ihre Konto-ID (oder, vor der Anmeldung, Ihre IP-Adresse), welche Aktion und wie viele Versuche',
      why: 'Um zu begrenzen, wie oft Passwörter, Codes, Benutzernamen-Prüfungen und Meldungen versucht werden können, gegen Raten und Spam.',
      basis: SECURITY,
      retention: 'Nach einem Tag gelöscht',
    },
    {
      what: 'Zähler fehlgeschlagener Anmeldungen: der versuchte Benutzername, Anzahl falscher Passwörter und Zeitpunkt',
      why: 'Damit Anmeldungen nach 5 falschen Passwörtern 30 Sekunden pausieren, zum Schutz vor Passwort-Raten.',
      basis: SECURITY,
      retention: 'Wird bei erfolgreicher Anmeldung gelöscht; sonst nach einem Tag',
    },
    {
      what: 'Von Supabase gespeicherte Anmeldeereignisse (Zeitpunkt, IP-Adresse, Browser)',
      why: 'Sicherheit des Anmeldedienstes und Ihre Liste der letzten Anmeldungen unter Kontoeinstellungen → Sicherheit (nur für Sie sichtbar).',
      basis: SECURITY,
      retention: SERVICES.authLogRetention,
    },
  ],
  visitor: [
    {
      what: 'Server-Protokolle des Hosting-Anbieters (IP-Adresse, aufgerufene Seiten, Browser, Zeitpunkt)',
      why: 'Damit die Website funktioniert und sicher bleibt.',
      basis: 'Berechtigtes Interesse (Art. 6 Abs. 1 lit. f DSGVO)',
      retention: SERVICES.hostingLogRetention,
    },
  ],
  recipients: [
    {
      name: 'Supabase, Inc.',
      role: 'Auftragsverarbeiter: Datenbank, Anmeldung und Konto-E-Mails',
      data: 'Alle oben genannten Kontodaten',
      location: `Projektregion: ${SERVICES.supabaseRegion}. Supabase ist ein US-Unternehmen.`,
    },
    {
      name: 'Google (für Personen im EWR: Google Ireland Limited)',
      role: 'Eigenständiger Verantwortlicher, nur wenn Sie „Weiter mit Google“ wählen',
      data: 'Google bestätigt Ihre Identität und übermittelt Bronze Ihren Namen, Ihre E-Mail-Adresse und Ihr Bild',
      location: 'Siehe Googles Datenschutzerklärung',
    },
    {
      name: SERVICES.hosting,
      role: 'Auftragsverarbeiter: stellt die Dateien der Website bereit',
      data: 'Server-Protokolle (IP-Adresse, aufgerufene Seiten, Browser)',
      location: SERVICES.hosting,
    },
    { name: SERVICES.emailProvider, role: 'Auftragsverarbeiter: versendet Konto-E-Mails', data: 'E-Mail-Adresse und Inhalt der E-Mail', location: SERVICES.emailProvider },
    {
      name: 'Andere Spieler und Besucher',
      role: 'Sehen Ihr Profil, soweit Ihre Privatsphäre-Einstellungen es zulassen',
      data: 'Immer Benutzername und Avatar; bei einem öffentlichen Profil (oder, sobald es Freunde gibt, „Nur Freunde“ für Ihre Freunde) auch Kurzbeschreibung, Land, Spielstatistik, Partieverlauf und Beitrittsdatum',
      location: 'Überall, wo Bronze gespielt wird',
    },
  ],
}

const HEAD = ['Was', 'Warum', 'Rechtsgrundlage', 'Wie lange']
const dataRows = (items: DataItem[]) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])

function PrivacyPolicy() {
  return (
    <LegalPage
      title={"Datenschutz\u00ADerklärung"}
      intro={
        <p>
          Bronze ist ein Strategiespiel, das Sie im Browser spielen können. Als Gast können Sie spielen, ohne uns etwas über sich mitzuteilen. Diese Erklärung
          beschreibt, was wir verarbeiten, wenn Sie ein Konto anlegen, warum, und welche Rechte Sie haben.
        </p>
      }
    >
      <Section id="controller" title="Wer wir sind">
        <p>
          Verantwortlicher für Ihre personenbezogenen Daten ist <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />),{' '}
          <Fill value={OPERATOR.address} />. Unternehmenskennziffer <Fill value={OPERATOR.companyNumber} />. Bei allen Fragen zu Ihren Daten schreiben Sie an{' '}
          <Email value={OPERATOR.email} />. Siehe auch unser <TextLink to={PATHS.legal}>Impressum</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Spielen als Gast">
        <p>
          Als Gast wird nichts über Sie an uns gesendet. Ihre Partien laufen in Ihrem Browser, und was Bronze sich merkt (Ihre laufende Partie und, wenn Sie es
          erlauben, Ihre Einstellungen und Statistik), bleibt im Speicher Ihres Browsers. Die vollständige Liste finden Sie in der{' '}
          <TextLink to={PATHS.cookies}>Cookie-Richtlinie</TextLink>. Unser Hosting-Anbieter sieht dennoch die technischen Daten, die jede Website erhält:
        </p>
        <DataTable caption="Daten, die für jeden Besucher verarbeitet werden" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Mit einem Konto">
        <p>
          Ein Konto ist freiwillig. Damit behalten Sie Statistik und Erfolge geräteübergreifend, und es wird für das Online-Spiel nötig sein, sobald es kommt.
          Wir erheben nur, was das Konto braucht, und fragen nie nach Ihrer Telefonnummer, Ihrem Geburtsdatum oder Standort. Kurzbeschreibung, Land und
          Avatarbild sind freiwillig: Wir haben sie nur, wenn Sie sie hinzufügen.
        </p>
        <DataTable caption="Daten, die für Kontoinhaber verarbeitet werden" head={HEAD} rows={dataRows(inventory.account)} />
        <Sub title="Ihr Profil und wer es sieht">
          <p>
            Ihr Profil hat eine eigene Seite. Unter Kontoeinstellungen → Privatsphäre wählen Sie, wer Ihr Profil und, getrennt davon, Ihren Partieverlauf sieht:{' '}
            <strong className={strong}>Öffentlich</strong> (alle, auch nicht angemeldete Besucher), <strong className={strong}>Nur Freunde</strong> (solange
            Bronze keine Freunde kennt, nur Sie) oder <strong className={strong}>Privat</strong> (nur Sie). Benutzername und Avatar sind immer sichtbar, damit
            andere Spieler Sie erkennen. Konten von Spielern unter 18 beginnen mit „Nur Freunde“. Ihre E-Mail-Adresse wird
            niemandem angezeigt.
          </p>
        </Sub>
        <p>
          Wenn Sie Ihr Konto löschen, wird all dies sofort gelöscht, auch ein hochgeladenes Bild. Kopien können in Datenbanksicherungen bis zu <Fill value={SERVICES.backupRetention} />{' '}
          verbleiben, bis sie überschrieben werden. Beginnen Sie die Anmeldung mit Google, schließen die Kontoerstellung aber nicht ab, wird es mit „Nicht jetzt“
          sofort gelöscht; andernfalls wird die unvollständige Registrierung nach 7 Tagen gelöscht. Ebenso eine E-Mail-Registrierung, die nie bestätigt wird.
        </p>
        <p>
          Wir verkaufen Ihre Daten nicht, zeigen Ihnen keine Werbung, erstellen kein Profil von Ihnen und treffen keine automatisierten Entscheidungen über Sie.
          Bronze hat keine Analyse- oder Tracking-Werkzeuge.
        </p>
      </Section>

      <Section id="emails" title="E-Mails">
        <p>
          Wir senden die Konto-E-Mails, die Sie brauchen: Bestätigung Ihrer Adresse, Zurücksetzen des Passworts und Sicherheitshinweise, wenn sich Ihr Passwort,
          Ihre E-Mail-Adresse oder Ihre Zwei-Faktor-Einstellungen ändern. Sie enthalten nichts anderes. Neuigkeiten
          oder andere optionale E-Mails würden wir nur senden, wenn Sie sie einschalten, und nie an Personen unter 18. Bronze versendet noch keine optionalen
          E-Mails. Jede optionale E-Mail wird einen Abmeldelink mit einem Klick enthalten, und Sie können Ihre Auswahl jederzeit unter Einstellungen →
          Benachrichtigungen ändern.
        </p>
      </Section>

      <Section id="recipients" title="Wer Ihre Daten außerdem verarbeitet">
        <DataTable
          caption="Empfänger personenbezogener Daten"
          head={['Wer', 'Rolle', 'Was', 'Wo']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <Sub title="Übermittlungen außerhalb des EWR">
          <p>
            Supabase, Inc. hat seinen Sitz in den Vereinigten Staaten. Ihre Kontodaten werden in der oben genannten Projektregion gespeichert; soweit auf sie
            außerhalb des Europäischen Wirtschaftsraums zugegriffen wird oder sie dorthin übermittelt werden, sind sie durch{' '}
            <Fill value={SERVICES.transferSafeguards} /> geschützt. Sie können eine Kopie dieser Garantien anfordern.
          </p>
        </Sub>
      </Section>

      <Section id="rights" title="Ihre Rechte">
        <p>Nach der DSGVO können Sie:</p>
        <Bullets>
          <li>
            <strong className={strong}>Auskunft</strong> über Ihre Daten erhalten und sie <strong className={strong}>mitnehmen</strong> (Datenübertragbarkeit):
            Einstellungen → Konto → Meine Daten herunterladen liefert eine Kopie als Datei;
          </li>
          <li>
            sie <strong className={strong}>berichtigen</strong> lassen: ändern Sie sie in den Kontoeinstellungen oder schreiben Sie uns;
          </li>
          <li>
            sie <strong className={strong}>löschen</strong>: Einstellungen → Konto → Mein Konto löschen;
          </li>
          <li>
            einer Verarbeitung aufgrund berechtigter Interessen <strong className={strong}>widersprechen</strong> oder ihre{' '}
            <strong className={strong}>Einschränkung</strong> verlangen;
          </li>
          <li>
            eine <strong className={strong}>Einwilligung</strong> jederzeit <strong className={strong}>widerrufen</strong>, ohne dass dies frühere Verarbeitung
            berührt: Cookie-Einstellungen (in der Fußzeile) und Einstellungen → Benachrichtigungen;
          </li>
          <li>
            sich bei der litauischen Datenschutzbehörde <strong className={strong}>beschweren</strong>, der Staatlichen Datenschutzinspektion (
            <span lang="lt">Valstybinė duomenų apsaugos inspekcija, L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ), oder bei der Behörde Ihres Wohnorts.
          </li>
        </Bullets>
        <p>
          Wenn Sie sich nicht anmelden können, nutzen Sie die <TextLink to={PATHS.dataRequest}>Seite für Datenanfragen</TextLink> oder schreiben Sie an{' '}
          <Email value={OPERATOR.email} />. Wir antworten innerhalb von 30 Tagen (einem Monat). Bei komplexen Anfragen können wir diese Frist um bis zu zwei
          weitere Monate verlängern und nennen Ihnen den Grund innerhalb des ersten Monats. Wir können Sie bitten, die Anfrage von der E-Mail-Adresse Ihres Kontos
          aus zu bestätigen, damit niemand sonst Ihre Daten erhält.
        </p>
      </Section>

      <Section id="children" title="Kinder">
        <p>
          Konten gibt es nur für Personen ab {MIN_ACCOUNT_AGE} Jahren ({MIN_ACCOUNT_AGE} ist das Alter, ab dem Menschen in Litauen nach Art. 8 DSGVO selbst in
          Online-Dienste einwilligen können). Jüngere Spieler können als Gast spielen; dabei speichern wir nichts über sie. Bei der Registrierung fragen wir, ob
          Sie 14–17 oder 18+ sind; nach dem Geburtsdatum fragen wir nicht. Wir senden nie Marketing an Personen unter 18, und wer unter 18 ist, braucht für jeden
          Kauf die Erlaubnis eines Elternteils oder Vormunds (Bronze verkauft derzeit nichts). Erfahren wir, dass ein Konto einer Person unter {MIN_ACCOUNT_AGE}{' '}
          Jahren gehört, löschen wir es.
        </p>
      </Section>

      <Section id="security" title="Sicherheit">
        <p>
          Verbindungen sind verschlüsselt (HTTPS). Passwörter und Wiederherstellungscodes werden nur als Hashes gespeichert. Jeder Spieler kann nur seine
          eigenen privaten Daten lesen und ändern; nach 5 falschen Passwörtern pausieren Anmeldungen für diesen Benutzernamen 30 Sekunden, und Passwörter, Codes
          und Meldungen können nur wenige Male pro Stunde versucht werden. Unter Kontoeinstellungen → Sicherheit können Sie die Zwei-Faktor-Authentifizierung
          einschalten, Ihre letzten Anmeldungen sehen und Ihre anderen Geräte abmelden.
        </p>
      </Section>

      <Section id="changes" title="Änderungen dieser Erklärung">
        <p>
          Wenn wir diese Erklärung ändern, aktualisieren wir das Datum oben. Über wichtige Änderungen informieren wir Sie vor ihrem Inkrafttreten, im Spiel oder
          per E-Mail.
        </p>
      </Section>
    </LegalPage>
  )
}

function TermsOfService() {
  return (
    <LegalPage
      title={"Nutzungs\u00ADbedingungen"}
      intro={
        <p>
          Diese Bedingungen sind die Vereinbarung zwischen Ihnen und <Fill value={OPERATOR.name} /> („wir“) über die Nutzung von Bronze. Mit dem Anlegen eines
          Kontos akzeptieren Sie sie. Beim Spielen als Gast gelten nur die Abschnitte über faires Spiel und darüber, dass das Spiel so bereitgestellt wird, wie es
          ist.
        </p>
      }
    >
      <Section id="eligibility" title="Wer spielen darf">
        <p>
          Als Gast darf jeder spielen. Für ein Konto müssen Sie mindestens {MIN_ACCOUNT_AGE} Jahre alt sein. Sind Sie unter 18, muss ein Elternteil oder Vormund
          zustimmen, bevor Sie etwas kaufen (Bronze verkauft derzeit nichts).
        </p>
      </Section>

      <Section id="accounts" title="Ihr Konto">
        <Bullets>
          <li>Ein Konto pro Person. Verwenden Sie eine echte E-Mail-Adresse, auf die Sie zugreifen können, und geben Sie Ihr Passwort niemandem.</li>
          <li>Sie sind für Aktivitäten in Ihrem Konto verantwortlich, es sei denn, jemand ist ohne Ihr Verschulden hineingelangt.</li>
          <li>Sie können Ihr Konto jederzeit löschen: Einstellungen → Konto.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Benutzernamen">
        <p>
          Benutzernamen bestehen aus 3–20 Buchstaben, Ziffern und Unterstrichen und sind für andere Spieler sichtbar. Wählen Sie keinen Namen, der sich als jemand
          anderes ausgibt, beleidigt oder belästigt, zu Hass aufstachelt, sexuell ist oder für etwas wirbt. Wir können Sie bitten, einen Namen zu ändern, der gegen
          diese Regeln verstößt, oder ihn selbst ändern, wenn Sie es nicht tun.
        </p>
      </Section>

      <Section id="fair-play" title="Faires Spiel">
        <p>Spielen Sie das Spiel so, wie es gedacht ist. Nicht erlaubt ist:</p>
        <Bullets>
          <li>Schummeln, Bots oder Skripte, die für Sie spielen, oder das Ausnutzen von Fehlern (melden Sie sie uns lieber);</li>
          <li>den Dienst, die Konten anderer Spieler oder die Server zu stören;</li>
          <li>andere Spieler zu belästigen, zu bedrohen oder zu beleidigen oder etwas Rechtswidriges zu teilen.</li>
        </Bullets>
      </Section>

      <Section id="virtual-items" title="Virtuelle Gegenstände und Währung">
        <p>
          Bronze hat derzeit keine virtuellen Gegenstände und keine Spielwährung. Sollte es sie später geben: Sie sind eine Lizenz zur Nutzung in Bronze, kein
          Eigentum; sie haben keinen realen Wert und können nicht gegen Geld eingetauscht, verkauft oder auf ein anderes Konto übertragen werden. Ihre Rechte als
          Verbraucher an dem, wofür Sie bezahlt haben, bleiben davon unberührt (siehe <TextLink to={PATHS.refunds}>Erstattungsrichtlinie</TextLink>).
        </p>
      </Section>

      <Section id="content" title="Das Spiel und seine Inhalte">
        <p>
          Bronze, seine Grafiken, Karten und sein Code gehören <Fill value={OPERATOR.name} /> oder seinen Lizenzgebern (siehe{' '}
          <TextLink to={PATHS.credits}>Mitwirkende</TextLink>). Sie dürfen es für Ihren persönlichen, nicht kommerziellen Gebrauch spielen.
        </p>
      </Section>

      <Section id="termination" title="Sperrung und Schließung von Konten">
        <p>
          Wenn Sie schwer oder wiederholt gegen diese Bedingungen verstoßen, können wir Ihr Konto sperren oder schließen. Sofern das nicht unsicher oder
          rechtswidrig wäre, nennen wir Ihnen zuerst den Grund und geben Ihnen Gelegenheit zur Antwort. Sie können Ihr Konto jederzeit schließen.
        </p>
      </Section>

      <Section id="disclaimers" title="Verfügbarkeit">
        <p>
          Bronze ist eine frühe Version. Wir bemühen uns, dass es funktioniert und Ihre Daten sicher sind, aber Funktionen können sich ändern, und der Dienst kann
          ausfallen oder Fehler haben. Der Fortschritt als Gast liegt nur in Ihrem Browser: Wenn Sie Ihre Browserdaten löschen, ist er weg.
        </p>
      </Section>

      <Section id="liability" title="Haftung">
        <p>
          Bronze ist kostenlos. Wir haften nicht für indirekte Schäden oder Verluste, die Sie hätten vermeiden können. Nichts in diesen Bedingungen beschränkt die
          Haftung für Tod oder Körperverletzung durch Fahrlässigkeit, für Betrug, für vorsätzlich oder grob fahrlässig verursachte Schäden oder jede andere
          Haftung, die gesetzlich nicht beschränkt werden kann. Ihre gesetzlichen Rechte als Verbraucher bleiben unberührt.
        </p>
      </Section>

      <Section id="law" title="Anwendbares Recht und Streitigkeiten">
        <p>
          Für diese Bedingungen gilt litauisches Recht. Wenn Sie als Verbraucher in der EU leben, behalten Sie zusätzlich den Schutz der zwingenden
          Verbraucherschutzvorschriften Ihres Wohnsitzlandes und können sich an dessen Gerichte wenden.
        </p>
        <p>
          Wenden Sie sich bitte zuerst an uns unter <Email value={OPERATOR.email} />. Verbraucher können sich auch an die litauische Staatliche Behörde für
          Verbraucherschutz wenden (<span lang="lt">Valstybinė vartotojų teisių apsaugos tarnyba</span>,{' '}
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), die Verbraucherstreitigkeiten außergerichtlich beilegt.
        </p>
      </Section>

      <Section id="changes" title="Änderungen dieser Bedingungen">
        <p>
          Wir können diese Bedingungen aktualisieren, etwa wenn neue Funktionen hinzukommen. Über wichtige Änderungen informieren wir Sie vor ihrem Inkrafttreten,
          im Spiel oder per E-Mail. Wenn Sie nicht einverstanden sind, können Sie Ihr Konto löschen; andernfalls gelten die neuen Bedingungen ab ihrem Datum.
        </p>
      </Section>

      <Section id="contact" title="Kontakt">
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
      title="Erstattungsrichtlinie"
      intro={
        <p>
          Bronze ist kostenlos. Es gibt nichts für echtes Geld zu kaufen und keine Spielwährung, die man kaufen oder verdienen könnte. Der Shop ist noch nicht
          geöffnet, daher gibt es nichts zu erstatten.
        </p>
      }
    >
      <Section id="future" title="Wenn wir etwas verkaufen">
        <p>
          Bevor etwas verkauft wird, legt diese Seite Ihre Rechte dar, einschließlich des 14-tägigen EU-Widerrufsrechts und seiner Anwendung auf digitale Inhalte,
          und der volle Preis jedes Artikels wird vor der Zahlung angezeigt.
        </p>
      </Section>
      <Section id="contact" title="Fragen">
        <p>
          Schreiben Sie an <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

function CookiePolicy() {
  const title = (id: string) => inventory.categories.find((c) => c.id === id)!.title
  return (
    <LegalPage
      title="Cookie-Richtlinie"
      intro={
        <p>
          Bronze verwendet ein Cookie und einige Einträge im lokalen und im Sitzungsspeicher Ihres Browsers. Alle stammen von Bronze selbst: Nichts wird mit
          anderen Websites geteilt, und es gibt keine Werbe-, Analyse- oder Social-Media-Tracker.
        </p>
      }
    >
      <Section id="categories" title="Kategorien">
        <Bullets>
          {inventory.categories.map((c) => (
            <li key={c.id}>
              <strong className={strong}>{c.title}.</strong> {c.description}
            </li>
          ))}
        </Bullets>
        <p>
          Notwendiger Speicher wird für das gebraucht, worum Sie Bronze bitten, und benötigt daher keine Einwilligung. Alles andere wartet auf Ihre Einwilligung:
          Bis Sie Präferenzen erlauben, gelten Ihre Einstellungen nur, bis Sie die Seite schließen.
        </p>
      </Section>

      <Section id="list" title="Alles, was Bronze speichert">
        <DataTable
          caption="Von Bronze verwendete Cookies und Speicher"
          head={['Name', 'Art', 'Anbieter', 'Zweck', 'Kategorie', 'Dauer']}
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

      <Section id="choices" title="Ihre Wahl">
        <p>
          Sie können Ihre Auswahl jederzeit in den{' '}
          <button type="button" onClick={() => consentStore.reopen()} className={link}>
            Cookie-Einstellungen
          </button>{' '}
          ändern (auch in der Fußzeile jeder Seite). Wenn Sie eine Kategorie ausschalten, wird gelöscht, was sie gespeichert hat. Sie können auch alles, was Bronze
          gespeichert hat, unter Einstellungen → Konto oder über Ihren Browser löschen. Wir fragen nach 12 Monaten erneut, oder früher, wenn sich diese Richtlinie
          ändert.
        </p>
        <p>
          Mehr über Ihre Daten: <TextLink to={PATHS.privacy}>Datenschutzerklärung</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}

function LegalNotice() {
  const t = useT()
  const details: [string, string][] = [
    ['Betreiber', OPERATOR.name],
    ['Rechtsform', OPERATOR.legalForm],
    ['Anschrift', OPERATOR.address],
    ['E-Mail', OPERATOR.email],
    ['Unternehmenskennziffer', OPERATOR.companyNumber],
    ['USt-IdNr.', OPERATOR.vatNumber],
    ['Website', OPERATOR.siteUrl],
    ['Hosting', SERVICES.hosting],
  ]
  return (
    <LegalPage title="Impressum">
      <Section id="operator" title="Wer Bronze betreibt">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[13rem_1fr]">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="font-display font-bold tracking-[0.08em] break-words text-parchment-100 uppercase">{term}</dt>
              <dd className="mb-2 sm:mb-0">{value === OPERATOR.email ? <Email value={value} /> : <Fill value={value} />}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-parchment-300">
          Ist der Betreiber nicht umsatzsteuerlich registriert, kann die USt-Zeile entfallen. Lassen Sie jede Zeile weg, die nicht zutrifft.
        </p>
      </Section>

      <Section id="documents" title="Rechtliche Seiten">
        <DocumentLinks credits="Mitwirkende und Lizenzen" label={(key) => t.nav[key]} />
      </Section>
    </LegalPage>
  )
}

function Credits() {
  return (
    <LegalPage
      ornate
      title="Mitwirkende"
      intro={
        <p>
          Bronze ist ein eigenständiges Strategiespiel aus dem Industriezeitalter von <Fill value={OPERATOR.name} />. Es baut auf der Arbeit anderer auf, die
          unten genannt werden.
        </p>
      }
    >
      <Section id="fonts" title="Schriften">
        <DataTable
          caption="Schriften"
          head={['Schrift', 'Urheber', 'Lizenz']}
          rows={[
            ['Cinzel', 'Copyright 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel)', fileLink('licenses/OFL-cinzel.txt', 'SIL Open Font License 1.1')],
            ['Barlow', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow.txt', 'SIL Open Font License 1.1')],
            ['Barlow Condensed', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow-condensed.txt', 'SIL Open Font License 1.1')],
          ]}
        />
        <p className="text-sm">Die Schriften werden aus Bronzes eigenen Dateien geladen (gepackt von Fontsource), nicht von Google oder einem anderen Server.</p>
      </Section>

      <Section id="art" title="Grafik und Ton">
        <DataTable
          caption="Grafik und Ton"
          head={['Was', 'Von wem']}
          rows={[
            [
              'Die gemalte Karte, Industriesymbole, Routentexturen, Verbindungsmarker und Sechsecke, Bilder der Handelsplätze, Lobby-Tafeln und Messingknöpfe',
              <>
                <Fill value={OPERATOR.name} />, mit KI-Bildgenerierung
              </>,
            ],
            ['Hintergrundgemälde', 'Mit KI für Bronze erzeugt'],
            ['Logo und Ornamente', 'Für Bronze gestaltet'],
            ['Oberflächensymbole', 'Für Bronze gezeichnet'],
            ['Das „G“ auf der Anmeldeschaltfläche', 'Das Google-Logo, eine Marke der Google LLC, auf der Anmeldeschaltfläche so verwendet, wie Googles Richtlinien es verlangen'],
            ['Soundeffekte und Musik', 'Werden beim Spielen in Ihrem Browser erzeugt (Web Audio): keine Aufnahmen'],
          ]}
        />
      </Section>

      <Section id="software" title="Software">
        <p>
          Bronze ist gebaut mit React, React Router, dem JavaScript-Client von Supabase, Tailwind CSS und Vite, alle unter der MIT-Lizenz, sowie einigen
          kleineren Open-Source-Paketen. Die vollständige Liste mit allen Lizenztexten: {fileLink('THIRD_PARTY_NOTICES.txt', 'Hinweise zu Drittanbietern')} (auf
          Englisch).
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
    title: 'Datenanfragen',
    intro: (
      <p>
        Wenn Sie sich anmelden können, geht es im Spiel am schnellsten: Unter Einstellungen → Konto finden Sie <strong>Meine Daten herunterladen</strong> und{' '}
        <strong>Mein Konto löschen</strong>. Wenn Sie sich nicht anmelden können, fragen Sie uns hier.
      </p>
    ),
    howTitle: 'So funktioniert es',
    how: [
      'Wir antworten innerhalb von 30 Tagen (einem Monat). Bei komplexen Anfragen kann sich dies um zwei Monate verlängern; das teilen wir Ihnen im ersten Monat mit.',
      'Zum Schutz Ihres Kontos antworten wir an die E-Mail-Adresse des Kontos und können Sie bitten, die Anfrage von dort zu bestätigen.',
    ],
    rights: (policy) => <>Ihre Rechte sind in der {policy} erklärt.</>,
    formTitle: 'Anfrage stellen',
    formIntro: (email) => <>Dieses Formular schreibt eine E-Mail an {email}, die Sie aus Ihrem eigenen E-Mail-Programm senden. Bis Sie sie absenden, wird nichts gesendet.</>,
    noAddress: 'Die E-Mail-Adresse des Betreibers ist noch nicht eingetragen, daher kann dieses Formular nicht gesendet werden.',
    what: 'Was möchten Sie?',
    requests: {
      access: 'Eine Kopie meiner Daten (Auskunft / Übertragbarkeit)',
      erasure: 'Mein Konto und meine Daten löschen',
      rectification: 'Meine Daten berichtigen',
      objection: 'Widerspruch oder Einschränkung der Verarbeitung',
      other: 'Etwas anderes',
    },
    email: 'E-Mail-Adresse Ihres Kontos',
    emailError: 'Geben Sie die E-Mail-Adresse Ihres Bronze-Kontos ein, damit wir es finden und antworten können.',
    username: 'Benutzername (optional)',
    details: 'Einzelheiten (optional)',
    submit: 'E-Mail schreiben',
    subject: (request) => `Bronze-Datenanfrage: ${request}`,
    body: (request, email, username, details) => [`Anfrage: ${request}`, `Konto-E-Mail: ${email}`, `Benutzername: ${username}`, '', details].join('\n'),
    notGiven: '(nicht angegeben)',
  },
  unsubscribe: {
    title: 'Abmelden',
    lists: { marketing: 'Neuigkeiten über Bronze', friends: 'Freundes-E-Mails', tournaments: 'Turnier-E-Mails', all: 'optionalen E-Mails' },
    done: 'Sie sind abgemeldet',
    working: 'Abmelden…',
    failed: 'Abmelden fehlgeschlagen',
    doneBody: (list) => `Sie erhalten keine ${list} mehr. Bereits versendete E-Mails können noch einige Minuten eintreffen.`,
    workingBody: 'Einen Moment…',
    notFoundBody: 'Dieser Abmeldelink ist ungültig. Vielleicht wurde er unvollständig kopiert.',
    failedBody: 'Etwas ist schiefgelaufen. Bitte versuchen Sie den Link in einer Minute erneut.',
    unavailableBody: 'Auf dieser Website sind keine Konten eingerichtet, daher gibt es keine E-Mails zum Abbestellen.',
    more: (l) => <>Angemeldet können Sie alle E-Mail-Einstellungen unter Einstellungen → Benachrichtigungen ändern. Fragen: {l}.</>,
    dataRequests: 'Datenanfragen',
  },
}

export default legal
