/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
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
const UNTIL_CLEARED = 'Bis Sie ihn löschen'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Merkt sich, dass Sie den Cookie-Hinweis gesehen haben, mit Datum und Version der Richtlinie.',
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
      duration: 'Bis Sie sie löschen oder sich anmelden',
    },
  },
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
      what: 'Online-Partien: welche Partien Sie gespielt haben, Ihr Platz, jeder Ihrer Züge mit Zeitpunkt, das Ergebnis sowie Ihre Uhr und Verbindung während der Partie',
      why: 'Um Online-Partien durchzuführen: jeden Zug prüfen, faires Spiel sichern, die Partie ihren Spielern (und Zuschauern öffentlicher Partien) zeigen und sie nachspielen lassen.',
      basis: CONTRACT,
      retention: 'Solange die Partie aufbewahrt wird. Wenn Sie Ihr Konto löschen, steht auf Ihrem Platz „Gelöschter Spieler“ und er ist nicht mehr mit Ihnen verknüpft; die Züge bleiben, damit die anderen Spieler ihre Partie behalten.',
    },
    {
      what: 'Wertungen: Ihre Wertung auf jeder Karte, wie sicher sie ist, gespielte Partien, Ihr Bestwert und jede Änderung nach einer gewerteten Partie',
      why: 'Um Spieler ähnlicher Stärke zusammenzubringen und Wertungen in Profilen und der Bestenliste zu zeigen.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Freunde: die Spieler, die Sie hinzugefügt haben, gesendete und erhaltene Freundschaftsanfragen und Spieleinladungen',
      why: 'Ihre Freundesliste, Anfragen und Einladungen zu Partien.',
      basis: CONTRACT,
      retention: 'Bis Sie oder Ihr Freund sie entfernen oder einer von Ihnen sein Konto löscht. Eine Einladung verschwindet, sobald sie genutzt wird oder die Partie beginnt.',
    },
    {
      what: 'Online-Status: wann Ihre App zuletzt mit dem Spielserver verbunden war',
      why: 'Damit Ihre Freunde sehen, ob Sie online sind (in den letzten 2 Minuten gesehen).',
      basis: CONTRACT,
      retention: 'Wird jedes Mal ersetzt; mit Ihrem Konto gelöscht',
    },
    {
      what: 'Schnelles Spiel: Ihre Wertung und die gewünschte Art von Partie, während Sie auf Mitspieler warten',
      why: 'Um Ihnen Spieler ähnlicher Stärke zu finden.',
      basis: CONTRACT,
      retention: 'Bis Mitspieler gefunden sind oder Sie das Warten beenden',
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
      data: 'Immer Ihr Benutzername und Avatar. Bei einem öffentlichen Profil (oder „Nur Freunde“, für Ihre Freunde) auch Ihre Beschreibung, Ihr Land, Ihre Bilanz, Wertungen, letzten Partien und wann Sie beigetreten sind. In Online-Partien Ihr Platz, Ihre Züge und Ihr Ergebnis (für deren Spieler und Zuschauer öffentlicher Partien). Freunde sehen, wann Sie online sind. Eine gefestigte Wertung steht in der Bestenliste.',
      location: 'Überall, wo Bronze gespielt wird',
    },
  ],
}

const HEAD = ['Was', 'Warum', 'Rechtsgrundlage', 'Wie lange']
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
      title="Datenschutzerklärung"
      intro={<p>Diese Seite erklärt in einfachen Worten, was Bronze über Sie weiß, warum, wer es noch sieht und was Sie dagegen tun können.</p>}
    >
      <Section id="short" title="Kurz gesagt">
        <Bullets>
          <li>Gegen den Computer können Sie als Gast spielen. Dann wird nichts über Sie an uns gesendet.</li>
          <li>Ein Konto braucht eine E-Mail-Adresse, ein Passwort (oder Google) und einen Benutzernamen. Alles andere entscheiden Sie.</li>
          <li>Online-Partien speichern jeden Zug, damit das Spiel fair bleibt und Partien nachgespielt werden können.</li>
          <li>Keine Werbung, keine Analyse, kein Tracking. Wir verkaufen Ihre Daten nie.</li>
          <li>
            Unter <strong className={strong}>Einstellungen → Konto</strong> können Sie jederzeit alles herunterladen, was wir über Sie haben, oder Ihr Konto löschen.
          </li>
        </Bullets>
      </Section>

      <Section id="controller" title="Wer wir sind">
        <p>
          Bronze wird betrieben von <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />, Unternehmenscode{' '}
          <Fill value={OPERATOR.companyNumber} />. Wir entscheiden, wie Ihre Daten verwendet werden (wir sind der „Verantwortliche“). Fragen zu Ihren Daten:{' '}
          <Email value={OPERATOR.email} />. Mehr im <TextLink to={PATHS.legal}>Impressum</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Als Gast spielen">
        <p>
          Als Gast spielen Sie in Ihrem Browser gegen den Computer. Partie, Einstellungen und Bilanz bleiben im Speicher Ihres Browsers (siehe{' '}
          <TextLink to={PATHS.cookies}>Cookie-Richtlinie</TextLink>). Wie jede Website sieht unser Hoster einige technische Daten:
        </p>
        <DataTable caption="Daten aller Besucher" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Was wir speichern, wenn Sie ein Konto haben">
        <p>Wir speichern nur, was Bronze braucht. Wir fragen nie nach Geburtsdatum, Adresse oder Standort. Beschreibung, Land und Bild sind freiwillig.</p>
        <DataTable caption="Daten von Kontoinhabern" head={HEAD} rows={dataRows(inventory.account)} />
        <p>
          „Rechtsgrundlage“ ist die Regel der DSGVO (des EU-Datenschutzgesetzes), die jede Verwendung erlaubt. „Vertrag“ heißt: Wir brauchen es, um Ihnen das
          Spiel zu bieten, für das Sie sich angemeldet haben.
        </p>
      </Section>

      <Section id="online" title="Online spielen">
        <Bullets>
          <li>Jeder Zug einer Online-Partie wird von unserem Server geprüft und gespeichert. Die Spieler einer Partie und die Zuschauer öffentlicher Partien sehen das Brett, die Namen und die Züge. Ihre Karten sieht niemand sonst.</li>
          <li>Beendete Partien können ihre Spieler nachspielen, öffentliche alle.</li>
          <li>Gewertete Partien ändern Ihre Wertung. Sie steht in Ihrem Profil und, sobald sie gefestigt ist (nach 10 gewerteten Partien), in der Bestenliste.</li>
          <li>Ihre Freunde sehen, wann Sie online sind, also wann Ihre App in den letzten 2 Minuten mit unserem Server verbunden war.</li>
          <li>
            Wer Ihr Profil und Ihren Partieverlauf sieht, wählen Sie unter <strong className={strong}>Kontoeinstellungen → Privatsphäre</strong>:{' '}
            <strong className={strong}>Öffentlich</strong> (alle), <strong className={strong}>Nur Freunde</strong> oder <strong className={strong}>Privat</strong> (nur
            Sie). Benutzername und Bild sind immer sichtbar, Ihre E-Mail-Adresse nie. Konten von Spielern unter 18 starten mit „Nur Freunde“.
          </li>
        </Bullets>
      </Section>

      <Section id="recipients" title="Wer Ihre Daten noch sieht">
        <p>Diese Unternehmen helfen uns, Bronze zu betreiben. Sie dürfen Ihre Daten nur für diese Arbeit für uns nutzen (sie sind „Auftragsverarbeiter“), außer Google.</p>
        <DataTable
          caption="Empfänger personenbezogener Daten"
          head={['Wer', 'Rolle', 'Was', 'Wo']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <p>
          Supabase ist ein US-Unternehmen. Wenn Ihre Daten den Europäischen Wirtschaftsraum verlassen, sind sie durch <Fill value={SERVICES.transferSafeguards} />{' '}
          geschützt. Sie können eine Kopie anfordern.
        </p>
      </Section>

      <Section id="rights" title="Ihre Rechte">
        <Bullets>
          <li>
            <strong className={strong}>Ihre Daten sehen und mitnehmen</strong>: <strong className={strong}>Einstellungen → Konto → Meine Daten herunterladen</strong> gibt
            Ihnen eine Datei (JSON) mit allem oben Genannten: Konto, Profil, Bilanz, Online-Partien mit Ihren Zügen, Wertungen, Freunde und Einladungen.
          </li>
          <li>
            <strong className={strong}>Sie löschen</strong>: <strong className={strong}>Einstellungen → Konto → Mein Konto löschen</strong>. Sie bestätigen mit Ihrem
            Benutzernamen, und alles wird sofort gelöscht. Gespielte Online-Partien bleiben für die anderen Spieler erhalten, mit „Gelöschter Spieler“ auf Ihrem Platz
            und ohne Verbindung zu Ihnen. Sicherungen werden innerhalb von <Fill value={SERVICES.backupRetention} /> überschrieben.
          </li>
          <li>
            <strong className={strong}>Sie berichtigen</strong>: in den Kontoeinstellungen, oder fragen Sie uns.
          </li>
          <li>
            <strong className={strong}>Widersprechen oder Einschränkung verlangen</strong>, wo wir uns auf „berechtigtes Interesse“ stützen.
          </li>
          <li>
            <strong className={strong}>Einwilligungen widerrufen</strong> (etwa für freiwillige E-Mails) unter <strong className={strong}>Einstellungen → Benachrichtigungen</strong>.
          </li>
          <li>
            <strong className={strong}>Sich beschweren</strong> bei der litauischen Datenschutzbehörde, der Staatlichen Datenschutzinspektion (Valstybinė duomenų apsaugos
            inspekcija, <span lang="lt">L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ), oder bei der Behörde Ihres Wohnorts.
          </li>
        </Bullets>
        <p>
          Sie können sich nicht anmelden? Nutzen Sie die <TextLink to={PATHS.dataRequest}>Seite für Datenanfragen</TextLink> oder schreiben Sie an{' '}
          <Email value={OPERATOR.email} />. Wir antworten innerhalb von 30 Tagen. Eine schwierige Anfrage kann bis zu zwei Monate länger dauern; dann sagen wir Ihnen
          im ersten Monat, warum. Wir können Sie bitten, die Anfrage von der E-Mail-Adresse des Kontos zu bestätigen, damit niemand sonst Ihre Daten bekommt.
        </p>
      </Section>

      <Section id="emails" title="E-Mails">
        <p>
          Wir senden die E-Mails, die Ihr Konto braucht: Adressbestätigung, Passwort zurücksetzen und eine Nachricht, wenn sich Passwort, E-Mail oder
          Zwei-Faktor-Einstellungen ändern. Alles andere (etwa Neuigkeiten) nur, wenn Sie es einschalten, und nie an unter 18-Jährige. Jede freiwillige E-Mail hat
          einen Abmeldelink.
        </p>
      </Section>

      <Section id="children" title="Kinder">
        <p>
          Konten sind für Personen ab {MIN_ACCOUNT_AGE} Jahren ({MIN_ACCOUNT_AGE} ist das Alter, ab dem man in Litauen selbst in Online-Dienste einwilligen kann).
          Jüngere können als Gast spielen. Wir fragen, ob Sie 14–17 oder 18+ sind, nicht nach Ihrem Geburtsdatum. Erfahren wir, dass ein Konto jemandem unter{' '}
          {MIN_ACCOUNT_AGE} gehört, löschen wir es.
        </p>
      </Section>

      <Section id="security" title="Sicherheit">
        <p>
          Verbindungen sind verschlüsselt (HTTPS). Passwörter und Wiederherstellungscodes werden nur als Hashes gespeichert, die niemand lesen kann. Jeder Spieler
          sieht nur seine eigenen privaten Daten. Nach 5 falschen Passwörtern pausieren Anmeldungen. Unter{' '}
          <strong className={strong}>Kontoeinstellungen → Sicherheit</strong> können Sie die Zwei-Faktor-Anmeldung einschalten, Ihre letzten Anmeldungen sehen und andere
          Geräte abmelden.
        </p>
      </Section>

      <Section id="changes" title="Änderungen">
        <p>Wenn sich diese Erklärung ändert, ändert sich das Datum oben. Über wichtige Änderungen informieren wir Sie vorher im Spiel oder per E-Mail.</p>
      </Section>
    </LegalPage>
  )
}

function TermsOfService() {
  return (
    <LegalPage
      title="Nutzungsbedingungen"
      intro={
        <p>
          Das sind die Regeln für die Nutzung von Bronze – eine Vereinbarung zwischen Ihnen und <Fill value={OPERATOR.name} /> („wir“). Mit dem Anlegen eines Kontos
          akzeptieren Sie sie. Für Gäste gelten nur die Teile über faires Spiel und darüber, dass das Spiel „so, wie es ist“ angeboten wird.
        </p>
      }
    >
      <Section id="fan-made" title="Ein Fan-Spiel">
        <p>
          Bronze ist ein von Fans gemachtes Spiel, inspiriert von Brass. Es ist nicht mit Roxley Games oder den Autoren von Brass verbunden und wird von ihnen nicht
          unterstützt. Bronze ist kostenlos: Es gibt nichts zu kaufen und kein Spielgeld.
        </p>
      </Section>

      <Section id="eligibility" title="Wer spielen darf">
        <p>Als Gast darf jeder gegen den Computer spielen. Für ein Konto und Online-Spiele müssen Sie mindestens {MIN_ACCOUNT_AGE} Jahre alt sein.</p>
      </Section>

      <Section id="accounts" title="Ihr Konto">
        <Bullets>
          <li>Ein Konto pro Person. Nutzen Sie eine E-Mail-Adresse, die Sie lesen, und behalten Sie Ihr Passwort für sich.</li>
          <li>Sie sind für das verantwortlich, was in Ihrem Konto geschieht, außer jemand ist ohne Ihr Verschulden hineingekommen.</li>
          <li>Sie können Ihr Konto jederzeit unter Einstellungen → Konto löschen.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Benutzernamen">
        <p>
          Benutzernamen haben 3–20 Buchstaben, Ziffern und Unterstriche, und alle können sie sehen. Wählen Sie keinen, der sich als jemand anderes ausgibt, jemanden
          beleidigt, hasserfüllt oder sexuell ist oder etwas bewirbt. Verstößt Ihrer gegen diese Regeln, können wir Sie bitten, ihn zu ändern, oder ihn selbst ändern.
        </p>
      </Section>

      <Section id="fair-play" title="Fair Play">
        <p>Spielen Sie fair und freundlich. Nicht erlaubt ist:</p>
        <Bullets>
          <li>betrügen, in Online-Partien ein Programm für sich spielen lassen oder mit Fehlern gewinnen (melden Sie sie uns lieber);</li>
          <li>Partien absichtlich verlassen, um nicht zu verlieren, oder mit mehreren Konten in einer Partie spielen;</li>
          <li>den Dienst, die Konten anderer Spieler oder unsere Server angreifen;</li>
          <li>andere Spieler belästigen, bedrohen oder beleidigen oder etwas Illegales teilen.</li>
        </Bullets>
        <p>
          Wer eine begonnene Online-Partie verlässt, verliert sie: Ein Bot spielt den Platz zu Ende, und der Spieler wird Letzter. Sie können einen Spieler über sein
          Profil melden.
        </p>
      </Section>

      <Section id="content" title="Das Spiel">
        <p>
          Die Bronze-App, ihre Bilder, Karten und ihr Code gehören <Fill value={OPERATOR.name} /> oder den Menschen, die sie geschaffen haben (siehe{' '}
          <TextLink to={PATHS.credits}>Mitwirkende</TextLink>). Sie dürfen es zu Ihrem eigenen, nicht kommerziellen Vergnügen spielen.
        </p>
      </Section>

      <Section id="termination" title="Wenn Sie die Regeln brechen">
        <p>
          Wenn Sie die Regeln schwer oder wiederholt brechen, können wir Ihr Konto sperren oder schließen. Sofern das nicht unsicher oder rechtswidrig wäre, sagen wir
          Ihnen vorher, warum, und Sie können antworten.
        </p>
      </Section>

      <Section id="disclaimers" title="Das Spiel „so, wie es ist“">
        <p>
          Bronze ist eine frühe Version. Wir arbeiten daran, dass es läuft und Ihre Daten sicher sind, aber Funktionen können sich ändern, und es kann ausfallen oder
          Fehler haben. Wertungen und Ergebnisse können korrigiert werden, wenn ein Fehler oder Betrug sie beeinflusst hat. Gastfortschritt liegt nur in Ihrem
          Browser: Wenn Sie die Browserdaten löschen, ist er weg.
        </p>
      </Section>

      <Section id="liability" title="Haftung">
        <p>
          Bronze ist kostenlos. Wir haften nicht für indirekte Schäden oder Schäden, die Sie hätten vermeiden können. Das schränkt nie unsere Haftung für Tod oder
          Verletzung durch Fahrlässigkeit, für Betrug, für vorsätzlich oder grob fahrlässig verursachte Schäden oder für alles ein, was das Gesetz nicht einschränken
          lässt. Ihre Verbraucherrechte bleiben unberührt.
        </p>
      </Section>

      <Section id="law" title="Recht und Streitigkeiten">
        <p>
          Für diese Bedingungen gilt litauisches Recht. Wenn Sie als Verbraucher in der EU leben, schützt Sie weiterhin das Verbraucherrecht Ihres Landes, und Sie
          können dort vor Gericht gehen.
        </p>
        <p>
          Bitte wenden Sie sich zuerst an uns: <Email value={OPERATOR.email} />. Verbraucher können sich auch an die litauische Staatliche Behörde für
          Verbraucherschutz wenden (Valstybinė vartotojų teisių apsaugos tarnyba,{' '}
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), die Streitigkeiten außergerichtlich beilegt.
        </p>
      </Section>

      <Section id="changes" title="Änderungen">
        <p>
          Wir können diese Bedingungen aktualisieren, etwa bei neuen Funktionen. Über wichtige Änderungen informieren wir Sie vorher im Spiel oder per E-Mail. Wenn Sie
          nicht einverstanden sind, können Sie Ihr Konto löschen.
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
  return (
    <LegalPage
      title="Cookie-Richtlinie"
      intro={
        <p>
          Bronze verwendet ein Cookie und einige Einträge im Speicher Ihres Browsers, und zwar nur für das, was Bronze zum Funktionieren braucht. Alle gehören Bronze
          selbst: Nichts wird mit anderen Websites geteilt, und es gibt keine Werbe-, Analyse- oder Social-Media-Tracker.
        </p>
      }
    >
      <Section id="essential" title="Nur das Nötige">
        <p>
          Alles unten ist notwendig: Es hält Sie angemeldet, bewahrt Ihre laufende Partie und merkt sich Ihre Einstellungen und Auswahl. Für diese Art von Speicher
          verlangt das Gesetz keine Einwilligung, daher zeigt Bronze einmal einen Hinweis, statt Sie um Zustimmung oder Ablehnung zu bitten.
        </p>
      </Section>

      <Section id="list" title="Alles, was Bronze speichert">
        <DataTable caption="Von Bronze verwendete Cookies und Speicher" head={['Name', 'Art', 'Anbieter', 'Zweck', 'Wie lange']} rows={storageRows()} />
      </Section>

      <Section id="choices" title="Entfernen">
        <p>
          Sie können alles, was Bronze in diesem Browser gespeichert hat, unter Einstellungen → Konto → Dieses Gerät leeren oder in Ihren Browsereinstellungen
          entfernen. Sie werden abgemeldet, und Ihr Gastfortschritt geht verloren.
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
