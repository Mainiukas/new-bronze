/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, Sub, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
import { consentStore } from '../../../legal/consent'
import { STORAGE_ITEMS, type DataItem } from '../../../legal/inventory'
import { MIN_ACCOUNT_AGE, OPERATOR, SERVICES } from '../../../legal/operator'
import { DocumentLinks, fileLink, linkClass as link, strongClass as strong } from './shared'
import type { InventoryText, LegalText } from './types'

/* Les pages juridiques en français. Une traduction ; en cas de divergence, le texte anglais prévaut. */

const UNTIL_DELETED = 'Jusqu’à la suppression de votre compte'
const CONTRACT = 'Contrat (art. 6, par. 1, point b) du RGPD)'
const SECURITY = 'Intérêt légitime en matière de sécurité (art. 6, par. 1, point f) du RGPD)'
const LOCAL = 'Stockage local'
const SESSION = 'Stockage de session'
const LIBRARY = 'Bronze (bibliothèque de connexion Supabase)'
const UNTIL_CLEARED = 'Jusqu’à ce que vous l’effaciez ou retiriez votre consentement'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Retient vos choix en matière de cookies, leur date et la version de la politique à laquelle ils se rapportent.',
      duration: '12 mois, ou jusqu’à une modification de la politique',
    },
    'bronze.auth': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Vous garde connecté : vos clés de session et les données de base du compte (identifiant du compte, adresse e-mail).',
      duration: 'Jusqu’à la déconnexion ; sans « Rester connecté », jusqu’à la fermeture du navigateur',
    },
    'bronze.auth-code-verifier': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Un secret à usage unique qui termine en toute sécurité une connexion avec Google ou par lien envoyé par e-mail.',
      duration: 'Supprimé après usage',
    },
    'bronze.auth-user': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Données du compte que certaines versions de la bibliothèque de connexion conservent à côté de la session.',
      duration: 'Jusqu’à la déconnexion',
    },
    'bronze.auth.remember': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Si vous avez coché « Rester connecté » lors de la connexion.',
      duration: 'Jusqu’à la prochaine connexion',
    },
    bronze_session_alive: {
      where: 'Cookie',
      provider: 'Bronze',
      purpose: 'Indique à Bronze que le navigateur a été fermé, pour qu’une connexion sans « Rester connecté » prenne fin. Contient seulement la valeur 1.',
      duration: 'Jusqu’à la fermeture du navigateur (cookie de session)',
    },
    'bronze.auth.returnTo': {
      where: SESSION,
      provider: 'Bronze',
      purpose: 'La page où revenir après une connexion avec Google.',
      duration: 'Cet onglet uniquement ; supprimé après la connexion',
    },
    'bronze.auth.failures': {
      where: SESSION,
      provider: 'Bronze',
      purpose: 'Compte les mots de passe erronés pour suspendre les connexions 30 secondes après 5 échecs (sécurité).',
      duration: 'Cet onglet uniquement',
    },
    'bronze.match': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Votre partie en cours, pour que « Continuer » reprenne là où vous vous êtes arrêté.',
      duration: 'Jusqu’à la fin de la partie ou son abandon',
    },
    'bronze.stats.pending.<id>': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Une copie des statistiques de votre compte jusqu’à ce que le serveur confirme leur enregistrement, pour ne rien perdre en cas de coupure.',
      duration: 'Supprimé une fois enregistré',
    },
    'bronze.boardDraft': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Modifications non enregistrées dans l’éditeur de carte (#/board?edit=1). Créé seulement si vous utilisez l’éditeur.',
      duration: 'Jusqu’à ce que vous les réinitialisiez',
    },
    'bronze.settings': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Vos paramètres : langue, son, volume, vitesse des animations et de l’ordinateur, minuteur de tour, journal de partie.',
      duration: UNTIL_CLEARED,
    },
    'bronze.lobby.gameMode': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Le dernier mode de jeu choisi.',
      duration: UNTIL_CLEARED,
    },
    'bronze.lobby.map': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'La dernière carte choisie.',
      duration: UNTIL_CLEARED,
    },
    'bronze.setup': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Les places de la dernière partie configurée : noms, couleurs et niveaux de l’ordinateur.',
      duration: UNTIL_CLEARED,
    },
    'bronze.stats': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Vos statistiques et succès en tant qu’invité (transférés dans votre compte à la connexion).',
      duration: 'Jusqu’à ce que vous les effaciez, retiriez votre consentement ou vous connectiez',
    },
  },
  categories: [
    { id: 'essential', title: 'Essentiels', description: 'Vous gardent connecté, sauvegardent votre partie en cours et retiennent vos choix de cookies. Toujours actifs.' },
    {
      id: 'preferences',
      title: 'Préférences',
      description: 'Retiennent sur cet appareil vos paramètres, le dernier mode de jeu, la carte, les places et vos statistiques d’invité.',
    },
    { id: 'analytics', title: 'Mesure d’audience', description: 'Bronze n’utilise aucune mesure d’audience aujourd’hui. Si cela change, elle ne fonctionnera que si vous l’activez.' },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Bronze n’utilise aucun traceur publicitaire ou marketing aujourd’hui. Si cela change, ils ne fonctionneront que si vous les activez.',
    },
  ],
  account: [
    {
      what: 'Adresse e-mail',
      why: 'Pour vous connecter, et pour les e-mails liés au compte (confirmation de l’adresse, réinitialisation du mot de passe).',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Mot de passe',
      why: 'Pour vous connecter. Supabase n’en conserve qu’une empreinte irréversible ; personne ne peut le lire.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    { what: 'Nom d’utilisateur', why: 'Votre nom dans le jeu. Les autres joueurs le voient.', basis: CONTRACT, retention: UNTIL_DELETED },
    {
      what: 'Données du compte Google (nom, adresse e-mail, photo de profil, identifiant Google), seulement si vous vous connectez avec Google',
      why: 'Pour la connexion avec Google. Le nom sert à suggérer un nom d’utilisateur ; la photo est votre avatar, visible par les autres joueurs.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Confirmation d’âge : 14–17 ans ou 18 ans et plus (pas de date de naissance)',
      why: 'Les comptes sont réservés aux 14 ans et plus ; aucun e-mail marketing n’est envoyé aux moins de 18 ans.',
      basis: 'Obligation légale (art. 6, par. 1, point c) et art. 8 du RGPD)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Preuves de consentement : ce que vous avez accepté (Conditions, Politique de confidentialité, e-mails marketing), version et date',
      why: 'Pour pouvoir montrer ce que vous avez accepté, comme l’exige la loi.',
      basis: 'Obligation légale (art. 6, par. 1, point c) et art. 7, par. 1 du RGPD)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Préférences d’e-mails (marketing, amis et tournois ; toutes désactivées jusqu’à ce que vous les activiez)',
      why: 'Pour n’envoyer que les e-mails que vous souhaitez et vous permettre de vous désabonner en un clic.',
      basis: 'Consentement pour le marketing (art. 6, par. 1, point a) du RGPD) ; contrat pour les autres (point b))',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Statistiques de jeu : parties, victoires, meilleur score, marchandises livrées, cartes jouées, succès et date de déblocage, date d’inscription',
      why: 'Votre profil et vos succès. Les autres joueurs voient vos statistiques.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Compteur d’échecs de connexion : nom d’utilisateur essayé, nombre de mots de passe erronés et moment',
      why: 'Pour suspendre les connexions 30 secondes après 5 mots de passe erronés, contre les tentatives de devinette.',
      basis: SECURITY,
      retention: 'Effacé après une connexion réussie ; sinon supprimé au bout d’un jour',
    },
    {
      what: 'Événements de connexion conservés par Supabase (moment, adresse IP, navigateur)',
      why: 'Sécurité du service de connexion.',
      basis: SECURITY,
      retention: SERVICES.authLogRetention,
    },
  ],
  visitor: [
    {
      what: 'Journaux serveur de l’hébergeur (adresse IP, pages demandées, navigateur, moment)',
      why: 'Pour que le site fonctionne et reste sûr.',
      basis: 'Intérêt légitime (art. 6, par. 1, point f) du RGPD)',
      retention: SERVICES.hostingLogRetention,
    },
  ],
  recipients: [
    {
      name: 'Supabase, Inc.',
      role: 'Sous-traitant : base de données, connexion et e-mails du compte',
      data: 'Toutes les données de compte ci-dessus',
      location: `Région du projet : ${SERVICES.supabaseRegion}. Supabase est une entreprise américaine.`,
    },
    {
      name: 'Google (pour les personnes dans l’EEE : Google Ireland Limited)',
      role: 'Responsable de traitement distinct, seulement si vous choisissez « Continuer avec Google »',
      data: 'Google confirme votre identité et transmet à Bronze votre nom, votre adresse e-mail et votre photo',
      location: 'Voir la politique de confidentialité de Google',
    },
    {
      name: SERVICES.hosting,
      role: 'Sous-traitant : héberge les fichiers du site',
      data: 'Journaux serveur (adresse IP, pages demandées, navigateur)',
      location: SERVICES.hosting,
    },
    { name: SERVICES.emailProvider, role: 'Sous-traitant : envoie les e-mails du compte', data: 'Adresse e-mail et contenu de l’e-mail', location: SERVICES.emailProvider },
    {
      name: 'Autres joueurs',
      role: 'Voient votre profil public',
      data: 'Nom d’utilisateur, avatar, statistiques de jeu, date d’inscription',
      location: 'Partout où l’on joue à Bronze',
    },
  ],
}

const HEAD = ['Quoi', 'Pourquoi', 'Base juridique', 'Durée']
const dataRows = (items: DataItem[]) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      intro={
        <p>
          Bronze est un jeu de stratégie auquel vous pouvez jouer dans votre navigateur. En tant qu’invité, vous pouvez jouer sans rien nous dire de vous. Cette
          politique explique ce que nous traitons lorsque vous créez un compte, pourquoi, et quels sont vos droits.
        </p>
      }
    >
      <Section id="controller" title="Qui nous sommes">
        <p>
          Le responsable du traitement de vos données personnelles est <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />),{' '}
          <Fill value={OPERATOR.address} />. Code d’entreprise <Fill value={OPERATOR.companyNumber} />. Pour toute question sur vos données, écrivez à{' '}
          <Email value={OPERATOR.email} />. Voir aussi nos <TextLink to={PATHS.legal}>informations légales</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Jouer en tant qu’invité">
        <p>
          En tant qu’invité, rien vous concernant ne nous est envoyé. Vos parties se jouent dans votre navigateur, et ce dont Bronze se souvient (votre partie en
          cours et, si vous l’autorisez, vos paramètres et statistiques) reste dans le stockage de votre navigateur. La liste complète figure dans la{' '}
          <TextLink to={PATHS.cookies}>Politique relative aux cookies</TextLink>. Notre hébergeur voit néanmoins les données techniques que reçoit tout site web :
        </p>
        <DataTable caption="Données traitées pour chaque visiteur" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Avec un compte">
        <p>
          Un compte est facultatif. Il vous permet de conserver vos statistiques et succès d’un appareil à l’autre, et il sera nécessaire pour le jeu en ligne quand
          celui-ci arrivera. Nous ne collectons que ce dont le compte a besoin : ni numéro de téléphone, ni date de naissance, ni localisation.
        </p>
        <DataTable caption="Données traitées pour les titulaires d’un compte" head={HEAD} rows={dataRows(inventory.account)} />
        <p>
          Lorsque vous supprimez votre compte, tout ce qui précède est supprimé immédiatement. Des copies peuvent subsister dans les sauvegardes de la base de
          données jusqu’à <Fill value={SERVICES.backupRetention} />, jusqu’à ce qu’elles soient écrasées. Si vous commencez à vous connecter avec Google sans
          terminer la création du compte, choisir « Pas maintenant » le supprime aussitôt ; sinon, l’inscription inachevée est supprimée au bout de 7 jours. Il en
          va de même d’une inscription par e-mail jamais confirmée.
        </p>
        <p>
          Nous ne vendons pas vos données, ne vous montrons pas de publicité, ne vous profilons pas et ne prenons aucune décision automatisée à votre sujet.
          Bronze n’a aucun outil de mesure d’audience ou de suivi.
        </p>
      </Section>

      <Section id="emails" title="E-mails">
        <p>
          Nous envoyons les e-mails de compte dont vous avez besoin : confirmation de votre adresse et réinitialisation du mot de passe. Ils ne contiennent rien
          d’autre. Nous n’enverrions des nouvelles ou d’autres e-mails facultatifs que si vous les activez, et jamais à une personne de moins de 18 ans. Bronze
          n’envoie encore aucun e-mail facultatif. Chaque e-mail facultatif comportera un lien de désabonnement en un clic, et vous pouvez modifier vos choix à
          tout moment dans Paramètres → Notifications.
        </p>
      </Section>

      <Section id="recipients" title="Qui d’autre traite vos données">
        <DataTable
          caption="Destinataires des données personnelles"
          head={['Qui', 'Rôle', 'Quoi', 'Où']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <Sub title="Transferts hors de l’EEE">
          <p>
            Supabase, Inc. est établie aux États-Unis. Les données de votre compte sont stockées dans la région du projet indiquée ci-dessus ; lorsqu’elles sont
            consultées ou transférées hors de l’Espace économique européen, elles sont protégées par <Fill value={SERVICES.transferSafeguards} />. Vous pouvez
            nous demander une copie de ces garanties.
          </p>
        </Sub>
      </Section>

      <Section id="rights" title="Vos droits">
        <p>En vertu du RGPD, vous pouvez :</p>
        <Bullets>
          <li>
            <strong className={strong}>accéder</strong> à vos données et <strong className={strong}>les emporter</strong> (portabilité) : Paramètres → Compte →
            Télécharger mes données vous en donne une copie sous forme de fichier ;
          </li>
          <li>
            les <strong className={strong}>rectifier</strong> : écrivez-nous, ou modifiez vos paramètres dans le jeu ;
          </li>
          <li>
            les <strong className={strong}>effacer</strong> : Paramètres → Compte → Supprimer mon compte ;
          </li>
          <li>
            vous <strong className={strong}>opposer</strong> à un traitement fondé sur l’intérêt légitime, ou en demander la{' '}
            <strong className={strong}>limitation</strong> ;
          </li>
          <li>
            <strong className={strong}>retirer votre consentement</strong> à tout moment, sans effet sur ce qui précède : Paramètres des cookies (en pied de
            page) et Paramètres → Notifications ;
          </li>
          <li>
            <strong className={strong}>introduire une réclamation</strong> auprès de l’autorité lituanienne de protection des données, l’Inspection nationale de
            la protection des données (<span lang="lt">Valstybinė duomenų apsaugos inspekcija, L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ), ou auprès de l’autorité de votre lieu de résidence.
          </li>
        </Bullets>
        <p>
          Si vous ne pouvez pas vous connecter, utilisez la <TextLink to={PATHS.dataRequest}>page des demandes relatives aux données</TextLink> ou écrivez à{' '}
          <Email value={OPERATOR.email} />. Nous répondons sous 30 jours (un mois). Pour les demandes complexes, nous pouvons prolonger ce délai de deux mois au
          plus, et nous vous en indiquerons la raison au cours du premier mois. Nous pouvons vous demander de confirmer la demande depuis l’adresse e-mail de votre
          compte, afin que personne d’autre n’obtienne vos données.
        </p>
      </Section>

      <Section id="children" title="Enfants">
        <p>
          Les comptes sont réservés aux personnes de {MIN_ACCOUNT_AGE} ans ou plus ({MIN_ACCOUNT_AGE} ans est l’âge à partir duquel une personne peut, en
          Lituanie, consentir elle-même aux services en ligne selon l’article 8 du RGPD). Les joueurs plus jeunes peuvent jouer en tant qu’invités, ce qui ne
          conserve rien à leur sujet chez nous. À l’inscription, nous demandons si vous avez 14–17 ans ou 18 ans et plus ; nous ne demandons pas votre date de
          naissance. Nous n’envoyons jamais de marketing aux moins de 18 ans, et toute personne de moins de 18 ans a besoin de l’autorisation d’un parent ou
          tuteur pour tout achat (Bronze ne vend rien aujourd’hui). Si nous apprenons qu’un compte appartient à une personne de moins de {MIN_ACCOUNT_AGE} ans,
          nous le supprimons.
        </p>
      </Section>

      <Section id="security" title="Sécurité">
        <p>
          Les connexions sont chiffrées (HTTPS). Les mots de passe ne sont conservés que sous forme d’empreintes. Chaque joueur ne peut lire et modifier que ses
          propres données privées ; après 5 mots de passe erronés, les connexions pour ce nom d’utilisateur sont suspendues 30 secondes.
        </p>
      </Section>

      <Section id="changes" title="Modifications de cette politique">
        <p>
          Lorsque nous modifions cette politique, nous mettons à jour la date en haut de la page. Nous vous informerons des changements importants avant leur
          entrée en vigueur, dans le jeu ou par e-mail.
        </p>
      </Section>
    </LegalPage>
  )
}

function TermsOfService() {
  return (
    <LegalPage
      title="Conditions d’utilisation"
      intro={
        <p>
          Ces conditions sont l’accord entre vous et <Fill value={OPERATOR.name} /> (« nous ») sur l’utilisation de Bronze. En créant un compte, vous les
          acceptez. Si vous jouez en tant qu’invité, seules s’appliquent les parties sur le jeu loyal et sur la fourniture du jeu en l’état.
        </p>
      }
    >
      <Section id="eligibility" title="Qui peut jouer">
        <p>
          Tout le monde peut jouer en tant qu’invité. Pour créer un compte, vous devez avoir au moins {MIN_ACCOUNT_AGE} ans. Si vous avez moins de 18 ans, un
          parent ou tuteur doit donner son accord avant tout achat (Bronze ne vend rien aujourd’hui).
        </p>
      </Section>

      <Section id="accounts" title="Votre compte">
        <Bullets>
          <li>Un compte par personne. Utilisez une vraie adresse e-mail à laquelle vous avez accès, et ne communiquez votre mot de passe à personne.</li>
          <li>Vous êtes responsable de ce qui se passe sur votre compte, sauf si quelqu’un y a accédé sans faute de votre part.</li>
          <li>Vous pouvez supprimer votre compte à tout moment : Paramètres → Compte.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Noms d’utilisateur">
        <p>
          Les noms d’utilisateur comptent 3 à 20 lettres, chiffres et tirets bas, et sont visibles par les autres joueurs. Ne choisissez pas un nom qui usurpe
          l’identité de quelqu’un, qui insulte ou harcèle, qui incite à la haine, qui est à caractère sexuel ou qui fait de la publicité. Nous pouvons vous
          demander de changer un nom qui enfreint ces règles, ou le changer nous-mêmes si vous ne le faites pas.
        </p>
      </Section>

      <Section id="fair-play" title="Jeu loyal">
        <p>Jouez au jeu comme il est conçu. Il est interdit :</p>
        <Bullets>
          <li>de tricher, d’utiliser des robots ou scripts qui jouent à votre place, ou d’exploiter des bugs (signalez-les-nous plutôt) ;</li>
          <li>de perturber le service, les comptes des autres joueurs ou les serveurs ;</li>
          <li>de harceler, menacer ou insulter d’autres joueurs, ou de partager quoi que ce soit d’illégal.</li>
        </Bullets>
      </Section>

      <Section id="virtual-items" title="Objets et monnaie virtuels">
        <p>
          Bronze n’a aujourd’hui ni objets virtuels ni monnaie de jeu. S’il en existe plus tard : ils constituent une licence d’utilisation dans Bronze, et non une
          propriété ; ils n’ont aucune valeur réelle et ne peuvent être échangés contre de l’argent, vendus ou transférés vers un autre compte. Cela n’affecte pas
          vos droits de consommateur sur ce que vous avez payé (voir la <TextLink to={PATHS.refunds}>Politique de remboursement</TextLink>).
        </p>
      </Section>

      <Section id="content" title="Le jeu et son contenu">
        <p>
          Bronze, ses illustrations, ses cartes et son code appartiennent à <Fill value={OPERATOR.name} /> ou à ses concédants de licence (voir les{' '}
          <TextLink to={PATHS.credits}>Crédits</TextLink>). Vous pouvez y jouer pour votre usage personnel et non commercial.
        </p>
      </Section>

      <Section id="termination" title="Suspension et fermeture des comptes">
        <p>
          Si vous enfreignez ces conditions de manière grave ou répétée, nous pouvons suspendre ou fermer votre compte. Sauf si cela était dangereux ou illégal, nous
          vous en indiquerons d’abord la raison et vous donnerons la possibilité de répondre. Vous pouvez fermer votre compte à tout moment.
        </p>
      </Section>

      <Section id="disclaimers" title="Disponibilité">
        <p>
          Bronze est une version précoce. Nous faisons de notre mieux pour qu’il fonctionne et que vos données restent en sécurité, mais les fonctionnalités peuvent
          changer et le service peut être indisponible ou comporter des bugs. La progression en tant qu’invité n’existe que dans votre navigateur : si vous effacez
          les données de votre navigateur, elle disparaît.
        </p>
      </Section>

      <Section id="liability" title="Responsabilité">
        <p>
          Bronze est gratuit. Nous ne sommes pas responsables des pertes indirectes ni des pertes que vous auriez pu éviter. Rien dans ces conditions ne limite la
          responsabilité en cas de décès ou de dommage corporel causé par négligence, de fraude, de dommage causé intentionnellement ou par négligence grave, ni
          aucune autre responsabilité que la loi ne permet pas de limiter. Vos droits légaux de consommateur ne sont pas affectés.
        </p>
      </Section>

      <Section id="law" title="Droit applicable et litiges">
        <p>
          Ces conditions sont régies par le droit lituanien. Si vous êtes un consommateur résidant dans l’UE, vous conservez en outre la protection des règles
          impératives de protection des consommateurs de votre pays de résidence et pouvez saisir ses tribunaux.
        </p>
        <p>
          Contactez-nous d’abord à <Email value={OPERATOR.email} />. Les consommateurs peuvent aussi s’adresser au Service national lituanien de protection des
          droits des consommateurs (<span lang="lt">Valstybinė vartotojų teisių apsaugos tarnyba</span>,{' '}
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), qui règle les litiges de consommation à l’amiable.
        </p>
      </Section>

      <Section id="changes" title="Modifications de ces conditions">
        <p>
          Nous pouvons mettre à jour ces conditions, par exemple lorsque de nouvelles fonctionnalités arrivent. Nous vous informerons des changements importants
          avant leur entrée en vigueur, dans le jeu ou par e-mail. Si vous n’êtes pas d’accord, vous pouvez supprimer votre compte ; sinon, les nouvelles
          conditions s’appliquent à compter de leur date.
        </p>
      </Section>

      <Section id="contact" title="Contact">
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
      title="Politique de remboursement"
      intro={
        <p>
          Bronze est gratuit. Il n’y a rien à acheter avec de l’argent réel, ni aucune monnaie de jeu à acheter ou à gagner. La boutique n’est pas encore ouverte,
          il n’y a donc rien à rembourser.
        </p>
      }
    >
      <Section id="future" title="Si nous commençons à vendre">
        <p>
          Avant toute vente, cette page exposera vos droits, y compris le droit de rétractation de 14 jours prévu par l’UE et son application aux contenus
          numériques, et le prix total de chaque article sera affiché avant le paiement.
        </p>
      </Section>
      <Section id="contact" title="Questions">
        <p>
          Écrivez à <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

function CookiePolicy() {
  const title = (id: string) => inventory.categories.find((c) => c.id === id)!.title
  return (
    <LegalPage
      title="Politique relative aux cookies"
      intro={
        <p>
          Bronze utilise un cookie et quelques entrées dans le stockage local et de session de votre navigateur. Tous appartiennent à Bronze : rien n’est partagé
          avec d’autres sites, et il n’y a aucun traceur publicitaire, de mesure d’audience ou de réseaux sociaux.
        </p>
      }
    >
      <Section id="categories" title="Catégories">
        <Bullets>
          {inventory.categories.map((c) => (
            <li key={c.id}>
              <strong className={strong}>{c.title}.</strong> {c.description}
            </li>
          ))}
        </Bullets>
        <p>
          Le stockage essentiel est nécessaire à ce que vous demandez à Bronze ; il ne requiert donc pas votre consentement. Tout le reste attend votre
          consentement : tant que vous n’autorisez pas les Préférences, vos paramètres ne durent que jusqu’à la fermeture de la page.
        </p>
      </Section>

      <Section id="list" title="Tout ce que Bronze enregistre">
        <DataTable
          caption="Cookies et stockage utilisés par Bronze"
          head={['Nom', 'Type', 'Fournisseur', 'Finalité', 'Catégorie', 'Durée']}
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

      <Section id="choices" title="Vos choix">
        <p>
          Vous pouvez modifier vos choix à tout moment dans les{' '}
          <button type="button" onClick={() => consentStore.reopen()} className={link}>
            Paramètres des cookies
          </button>{' '}
          (également en pied de chaque page). Désactiver une catégorie supprime ce qu’elle a enregistré. Vous pouvez aussi effacer tout ce que Bronze a enregistré
          dans Paramètres → Compte, ou via votre navigateur. Nous vous redemandons après 12 mois, ou plus tôt si cette politique change.
        </p>
        <p>
          En savoir plus sur vos données : <TextLink to={PATHS.privacy}>Politique de confidentialité</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}

function LegalNotice() {
  const t = useT()
  const details: [string, string][] = [
    ['Exploitant', OPERATOR.name],
    ['Forme juridique', OPERATOR.legalForm],
    ['Adresse', OPERATOR.address],
    ['E-mail', OPERATOR.email],
    ['Code d’entreprise', OPERATOR.companyNumber],
    ['Numéro de TVA', OPERATOR.vatNumber],
    ['Site web', OPERATOR.siteUrl],
    ['Hébergement', SERVICES.hosting],
  ]
  return (
    <LegalPage title="Informations légales">
      <Section id="operator" title="Qui exploite Bronze">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="font-display font-bold tracking-[0.08em] text-parchment-100 uppercase">{term}</dt>
              <dd className="mb-2 sm:mb-0">{value === OPERATOR.email ? <Email value={value} /> : <Fill value={value} />}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-parchment-300">
          Si l’exploitant n’est pas assujetti à la TVA, la ligne TVA peut être supprimée. Omettez toute ligne qui ne s’applique pas.
        </p>
      </Section>

      <Section id="documents" title="Pages juridiques">
        <DocumentLinks credits="Crédits et licences" label={(key) => t.nav[key]} />
      </Section>
    </LegalPage>
  )
}

function Credits() {
  return (
    <LegalPage
      ornate
      title="Crédits"
      intro={
        <p>
          Bronze est un jeu de stratégie original de l’ère industrielle, créé par <Fill value={OPERATOR.name} />. Il s’appuie sur le travail d’autres personnes,
          citées ci-dessous.
        </p>
      }
    >
      <Section id="fonts" title="Polices">
        <DataTable
          caption="Polices"
          head={['Police', 'Auteur', 'Licence']}
          rows={[
            ['Cinzel', 'Copyright 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel)', fileLink('licenses/OFL-cinzel.txt', 'SIL Open Font License 1.1')],
            ['Barlow', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow.txt', 'SIL Open Font License 1.1')],
            ['Barlow Condensed', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow-condensed.txt', 'SIL Open Font License 1.1')],
          ]}
        />
        <p className="text-sm">Les polices sont servies depuis les fichiers de Bronze (empaquetées par Fontsource), et non chargées depuis Google ou un autre serveur.</p>
      </Section>

      <Section id="art" title="Illustrations et son">
        <DataTable
          caption="Illustrations et son"
          head={['Quoi', 'Réalisé par']}
          rows={[
            [
              'La carte peinte, les icônes d’industries, les textures des routes, les jetons de liaison et hexagones, les images des comptoirs, les panneaux du salon et les boutons en laiton',
              <>
                <Fill value={OPERATOR.name} />, avec des outils de génération d’images par IA
              </>,
            ],
            ['Peintures d’arrière-plan', 'Générées par IA pour Bronze'],
            ['Logo et ornements', 'Créés pour Bronze'],
            ['Icônes de l’interface', 'Dessinées pour Bronze'],
            ['Le « G » du bouton de connexion', 'Le logo de Google, marque de Google LLC, utilisé sur le bouton de connexion comme le demandent les consignes de Google'],
            ['Effets sonores et musique', 'Générés dans votre navigateur pendant que vous jouez (Web Audio) : aucun enregistrement'],
          ]}
        />
      </Section>

      <Section id="software" title="Logiciels">
        <p>
          Bronze est construit avec React, React Router, le client JavaScript de Supabase, Tailwind CSS et Vite, tous sous licence MIT, ainsi que quelques paquets
          open source plus petits. La liste complète, avec chaque texte de licence : {fileLink('THIRD_PARTY_NOTICES.txt', 'Mentions des tiers')} (en anglais).
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
    title: 'Demandes relatives aux données',
    intro: (
      <p>
        Si vous pouvez vous connecter, le plus rapide est de passer par le jeu : Paramètres → Compte propose <strong>Télécharger mes données</strong> et{' '}
        <strong>Supprimer mon compte</strong>. Si vous ne pouvez pas vous connecter, faites votre demande ici.
      </p>
    ),
    howTitle: 'Comment ça marche',
    how: [
      'Nous répondons sous 30 jours (un mois). Pour les demandes complexes, ce délai peut être prolongé de deux mois ; nous vous le dirons au cours du premier mois.',
      'Pour protéger votre compte, nous répondrons à l’adresse e-mail du compte et pourrons vous demander de confirmer la demande depuis celle-ci.',
    ],
    rights: (policy) => <>Vos droits sont expliqués dans la {policy}.</>,
    formTitle: 'Faire une demande',
    formIntro: (email) => <>Ce formulaire rédige un e-mail à {email}, que vous envoyez depuis votre propre messagerie. Rien n’est envoyé tant que vous ne l’envoyez pas.</>,
    noAddress: 'L’adresse e-mail de l’exploitant n’est pas encore renseignée ; ce formulaire ne peut donc pas être envoyé.',
    what: 'Que souhaitez-vous ?',
    requests: {
      access: 'Une copie de mes données (accès / portabilité)',
      erasure: 'Supprimer mon compte et mes données',
      rectification: 'Rectifier mes données',
      objection: 'M’opposer au traitement ou le limiter',
      other: 'Autre chose',
    },
    email: 'Adresse e-mail de votre compte',
    emailError: 'Saisissez l’adresse e-mail de votre compte Bronze, pour que nous puissions le retrouver et vous répondre.',
    username: 'Nom d’utilisateur (facultatif)',
    details: 'Précisions (facultatif)',
    submit: 'Rédiger l’e-mail',
    subject: (request) => `Demande Bronze relative aux données : ${request}`,
    body: (request, email, username, details) =>
      [`Demande : ${request}`, `E-mail du compte : ${email}`, `Nom d’utilisateur : ${username}`, '', details].join('\n'),
    notGiven: '(non indiqué)',
  },
  unsubscribe: {
    title: 'Se désabonner',
    lists: { marketing: 'de nouvelles de Bronze', friends: 'd’e-mails d’amis', tournaments: 'd’e-mails de tournois', all: 'd’e-mails facultatifs' },
    done: 'Vous êtes désabonné',
    working: 'Désabonnement…',
    failed: 'Désabonnement impossible',
    doneBody: (list) => `Vous ne recevrez plus ${list}. Les e-mails déjà en route peuvent encore arriver pendant quelques minutes.`,
    workingBody: 'Un instant…',
    notFoundBody: 'Ce lien de désabonnement n’est pas valide. Il a peut-être été copié de façon incomplète.',
    failedBody: 'Une erreur s’est produite. Réessayez le lien dans une minute.',
    unavailableBody: 'Les comptes ne sont pas activés sur ce site ; il n’y a donc aucun e-mail dont se désabonner.',
    more: (l) => <>Une fois connecté, vous pouvez modifier tous vos choix d’e-mails dans Paramètres → Notifications. Questions : {l}.</>,
    dataRequests: 'demandes relatives aux données',
  },
}

export default legal
