/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
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
const UNTIL_CLEARED = 'Jusqu’à ce que vous l’effaciez'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Retient que vous avez vu l’avis sur les cookies, avec la date et la version de la politique.',
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
      purpose: 'Les parties terminées de votre compte (et vos statistiques d’invité) jusqu’à ce que le serveur confirme l’enregistrement de chacune, pour ne rien perdre en cas de coupure.',
      duration: 'Supprimé une fois enregistré',
    },
    'bronze.boardDraft.v2': {
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
      duration: 'Jusqu’à ce que vous les effaciez ou vous connectiez',
    },
  },
  account: [
    {
      what: 'Adresse e-mail',
      why: 'Pour vous connecter, et pour les e-mails liés au compte (confirmation de l’adresse, réinitialisation du mot de passe, alertes de sécurité quand votre mot de passe, votre e-mail ou votre double authentification changent).',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Mot de passe',
      why: 'Pour vous connecter. Supabase n’en conserve qu’une empreinte irréversible ; personne ne peut le lire.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    { what: 'Nom d’utilisateur', why: 'Votre nom dans le jeu. Tout le monde peut le voir, quels que soient vos paramètres de confidentialité.', basis: CONTRACT, retention: UNTIL_DELETED },
    {
      what: 'Anciens noms d’utilisateur, et quand vous les avez changés',
      why: 'Pour que les liens vers votre ancien nom mènent à votre profil pendant 30 jours, et que personne d’autre ne puisse le prendre (et se faire passer pour vous) pendant ce temps.',
      basis: 'Intérêt légitime à empêcher l’usurpation d’identité (art. 6, par. 1, point f) du RGPD)',
      retention: '30 jours',
    },
    {
      what: 'Informations de profil que vous choisissez d’ajouter : bio, pays, avatar (un modèle ou une image que vous importez) ; et vos paramètres de confidentialité',
      why: 'Affichées sur votre profil, aux personnes que vos paramètres de confidentialité autorisent.',
      basis: CONTRACT,
      retention: 'Jusqu’à ce que vous les changiez ou supprimiez votre compte',
    },
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
      what: 'Statistiques de jeu : parties, victoires, meilleur score, marchandises livrées, cartes jouées, succès et date de déblocage, date d’inscription ; un identifiant aléatoire pour chaque résultat enregistré',
      why: 'Votre profil et vos succès, visibles par les personnes que vos paramètres de confidentialité autorisent. Les identifiants garantissent qu’un résultat envoyé deux fois ne compte qu’une fois.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Historique de parties : pour chaque partie terminée, la date, la carte et le mode de jeu, le nombre de joueurs, votre place, votre score, les marchandises livrées, les liaisons et industries construites',
      why: 'Vos dernières parties et vos statistiques sur votre profil, visibles par les personnes que vos paramètres de confidentialité autorisent.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Parties en ligne : les parties jouées, votre place, chacun de vos coups et son heure, le résultat, ainsi que votre pendule et votre connexion pendant la partie',
      why: 'Pour faire tourner les parties en ligne : vérifier chaque coup, garantir le fair-play, montrer la partie à ses joueurs (et aux spectateurs des parties publiques) et permettre de la revoir.',
      basis: CONTRACT,
      retention: 'Tant que la partie est conservée. Si vous supprimez votre compte, votre place affiche « Joueur supprimé » et n’est plus liée à vous ; les coups restent pour que les autres joueurs gardent leur partie.',
    },
    {
      what: 'Classements : votre classement sur chaque carte, sa fiabilité, le nombre de parties, votre meilleur score et chaque variation après une partie classée',
      why: 'Pour opposer des joueurs de niveau proche, et afficher les classements sur les profils et le tableau des meilleurs.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Amis : les joueurs que vous avez ajoutés, les demandes d’amis envoyées ou reçues et les invitations à jouer',
      why: 'Votre liste d’amis, vos demandes et vos invitations à des parties.',
      basis: CONTRACT,
      retention: 'Jusqu’à ce que vous ou votre ami la retiriez, ou que l’un de vous supprime son compte. Une invitation disparaît une fois utilisée ou quand la partie commence.',
    },
    {
      what: 'Statut en ligne : quand votre application a contacté le serveur de jeu pour la dernière fois',
      why: 'Pour montrer à vos amis si vous êtes en ligne (vu dans les 2 dernières minutes).',
      basis: CONTRACT,
      retention: 'Remplacé à chaque fois ; supprimé avec votre compte',
    },
    {
      what: 'Partie rapide : votre classement et le type de partie souhaité, pendant que vous attendez',
      why: 'Pour vous trouver des joueurs de niveau proche.',
      basis: CONTRACT,
      retention: 'Jusqu’à ce que vous trouviez des adversaires ou arrêtiez d’attendre',
    },
    {
      what: 'Double authentification, seulement si vous l’activez : la clé de l’application d’authentification (conservée par Supabase) et vos codes de récupération (conservés uniquement sous forme d’empreintes irréversibles)',
      why: 'Pour demander un code de votre téléphone à la connexion, et vous laisser entrer avec un code de récupération si vous le perdez.',
      basis: CONTRACT,
      retention: 'Jusqu’à ce que vous la désactiviez ou supprimiez votre compte',
    },
    {
      what: 'Signalements : quand vous signalez un joueur, ou qu’un joueur vous signale : qui, le motif, la note et la date',
      why: 'Pour examiner la triche, les noms injurieux, le harcèlement et le spam, et garder le jeu loyal et sûr.',
      basis: 'Intérêt légitime à un jeu sûr (art. 6, par. 1, point f) du RGPD)',
      retention: '12 mois ; moins si le compte signalé est supprimé',
    },
    {
      what: 'Compteurs anti-abus : l’identifiant de votre compte (ou, avant la connexion, votre adresse IP), l’action et le nombre d’essais',
      why: 'Pour limiter la fréquence des essais de mots de passe, de codes, de vérifications de nom d’utilisateur et de signalements, contre les tentatives de devinette et le spam.',
      basis: SECURITY,
      retention: 'Supprimés au bout d’un jour',
    },
    {
      what: 'Compteur d’échecs de connexion : nom d’utilisateur essayé, nombre de mots de passe erronés et moment',
      why: 'Pour suspendre les connexions 30 secondes après 5 mots de passe erronés, contre les tentatives de devinette.',
      basis: SECURITY,
      retention: 'Effacé après une connexion réussie ; sinon supprimé au bout d’un jour',
    },
    {
      what: 'Événements de connexion conservés par Supabase (moment, adresse IP, navigateur)',
      why: 'Sécurité du service de connexion, et votre liste de connexions récentes dans Paramètres du compte → Sécurité (visible par vous seul).',
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
      name: 'Autres joueurs et visiteurs',
      role: 'Voient votre profil, dans la mesure permise par vos paramètres de confidentialité',
      data: 'Toujours votre pseudo et votre avatar. Avec un profil public (ou « Amis uniquement », pour vos amis), aussi votre bio, votre pays, votre palmarès, vos classements, vos dernières parties et votre date d’inscription. Dans les parties en ligne, votre place, vos coups et votre résultat (pour ses joueurs, et les spectateurs des parties publiques). Vos amis voient quand vous êtes en ligne. Un classement établi figure au tableau des meilleurs.',
      location: 'Partout où l’on joue à Bronze',
    },
  ],
}

const HEAD = ['Quoi', 'Pourquoi', 'Base juridique', 'Durée']
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
      title="Politique de confidentialité"
      intro={<p>Cette page explique simplement ce que Bronze sait de vous, pourquoi, qui d’autre le voit et ce que vous pouvez y faire.</p>}
    >
      <Section id="short" title="En bref">
        <Bullets>
          <li>Vous pouvez jouer contre l’ordinateur en invité. Rien sur vous ne nous est alors envoyé.</li>
          <li>Un compte demande une adresse e-mail, un mot de passe (ou Google) et un pseudo. Le reste, c’est vous qui décidez.</li>
          <li>Les parties en ligne gardent chaque coup, pour que le jeu reste loyal et que les parties puissent être revues.</li>
          <li>Ni publicité, ni statistiques, ni pistage. Nous ne vendons jamais vos données.</li>
          <li>
            Dans <strong className={strong}>Paramètres → Compte</strong>, vous pouvez à tout moment télécharger tout ce que nous avons sur vous, ou supprimer votre
            compte.
          </li>
        </Bullets>
      </Section>

      <Section id="controller" title="Qui sommes-nous">
        <p>
          Bronze est exploité par <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />, code d’entreprise{' '}
          <Fill value={OPERATOR.companyNumber} />. Nous décidons de l’usage de vos données (nous sommes le « responsable du traitement »). Questions sur vos
          données : <Email value={OPERATOR.email} />. Plus d’infos dans les <TextLink to={PATHS.legal}>informations légales</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Jouer en invité">
        <p>
          En invité, vous jouez contre l’ordinateur dans votre navigateur. Votre partie, vos réglages et votre palmarès restent dans le stockage de votre navigateur
          (voir la <TextLink to={PATHS.cookies}>politique relative aux cookies</TextLink>). Comme pour tout site web, notre hébergeur voit quelques données
          techniques :
        </p>
        <DataTable caption="Données de tous les visiteurs" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Ce que nous gardons si vous avez un compte">
        <p>Nous ne gardons que ce dont Bronze a besoin. Nous ne demandons jamais votre date de naissance, votre adresse ni votre position. Bio, pays et photo sont facultatifs.</p>
        <DataTable caption="Données des titulaires de compte" head={HEAD} rows={dataRows(inventory.account)} />
        <p>
          La « base juridique » est la règle du RGPD (la loi européenne sur la protection des données) qui autorise chaque usage. « Contrat » signifie que nous en
          avons besoin pour vous offrir le jeu auquel vous vous êtes inscrit.
        </p>
      </Section>

      <Section id="online" title="Jouer en ligne">
        <Bullets>
          <li>Chaque coup d’une partie en ligne est vérifié et enregistré par notre serveur. Les joueurs d’une partie, et les spectateurs des parties publiques, voient le plateau, les noms et les coups. Personne d’autre ne voit vos cartes.</li>
          <li>Les parties terminées peuvent être revues par leurs joueurs, et les publiques par tout le monde.</li>
          <li>Les parties classées modifient votre classement. Il figure sur votre profil et, une fois établi (après 10 parties classées), au tableau des meilleurs.</li>
          <li>Vos amis voient quand vous êtes en ligne, c’est-à-dire quand votre application a contacté notre serveur dans les 2 dernières minutes.</li>
          <li>
            Vous choisissez qui voit votre profil et votre historique dans <strong className={strong}>Paramètres du compte → Confidentialité</strong> :{' '}
            <strong className={strong}>Public</strong> (tout le monde), <strong className={strong}>Amis uniquement</strong> ou <strong className={strong}>Privé</strong>{' '}
            (vous seul). Votre pseudo et votre photo sont toujours visibles, votre adresse e-mail jamais. Les comptes des joueurs de moins de 18 ans commencent en
            « Amis uniquement ».
          </li>
        </Bullets>
      </Section>

      <Section id="recipients" title="Qui d’autre voit vos données">
        <p>Ces entreprises nous aident à faire tourner Bronze. Elles ne peuvent utiliser vos données que pour ce travail (ce sont des « sous-traitants »), sauf Google.</p>
        <DataTable
          caption="Destinataires des données personnelles"
          head={['Qui', 'Rôle', 'Quoi', 'Où']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <p>
          Supabase est une entreprise américaine. Lorsque vos données quittent l’Espace économique européen, elles sont protégées par{' '}
          <Fill value={SERVICES.transferSafeguards} />. Vous pouvez nous en demander une copie.
        </p>
      </Section>

      <Section id="rights" title="Vos droits">
        <Bullets>
          <li>
            <strong className={strong}>Voir et emporter vos données</strong> : <strong className={strong}>Paramètres → Compte → Télécharger mes données</strong> vous
            donne un fichier (JSON) avec tout ce qui précède : compte, profil, palmarès, parties en ligne avec vos coups, classements, amis et invitations.
          </li>
          <li>
            <strong className={strong}>Les supprimer</strong> : <strong className={strong}>Paramètres → Compte → Supprimer mon compte</strong>. Vous tapez votre pseudo
            pour confirmer, et tout est supprimé aussitôt. Les parties en ligne jouées restent pour les autres joueurs, avec « Joueur supprimé » à votre place et
            sans lien avec vous. Les sauvegardes sont écrasées sous <Fill value={SERVICES.backupRetention} />.
          </li>
          <li>
            <strong className={strong}>Les corriger</strong> : dans les paramètres du compte, ou en nous le demandant.
          </li>
          <li>
            <strong className={strong}>Vous opposer ou demander une limitation</strong> lorsque nous nous fondons sur l’« intérêt légitime ».
          </li>
          <li>
            <strong className={strong}>Retirer votre consentement</strong> (par exemple aux e-mails facultatifs) dans <strong className={strong}>Paramètres → Notifications</strong>.
          </li>
          <li>
            <strong className={strong}>Porter plainte</strong> auprès de l’autorité lituanienne de protection des données, l’Inspection nationale de la protection des
            données (Valstybinė duomenų apsaugos inspekcija, <span lang="lt">L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ), ou auprès de celle de votre pays (en France, la CNIL).
          </li>
        </Bullets>
        <p>
          Vous ne pouvez pas vous connecter ? Utilisez la <TextLink to={PATHS.dataRequest}>page des demandes de données</TextLink> ou écrivez à{' '}
          <Email value={OPERATOR.email} />. Nous répondons sous 30 jours. Une demande complexe peut prendre jusqu’à deux mois de plus ; nous vous dirons alors
          pourquoi pendant le premier mois. Nous pouvons vous demander de confirmer depuis l’adresse e-mail du compte, pour que personne d’autre n’obtienne vos
          données.
        </p>
      </Section>

      <Section id="emails" title="E-mails">
        <p>
          Nous envoyons les e-mails nécessaires à votre compte : confirmation d’adresse, réinitialisation du mot de passe, et un message quand votre mot de passe,
          votre e-mail ou votre double authentification changent. Le reste (comme les nouveautés) seulement si vous l’activez, et jamais aux moins de 18 ans. Chaque
          e-mail facultatif a un lien de désinscription.
        </p>
      </Section>

      <Section id="children" title="Enfants">
        <p>
          Les comptes sont réservés aux personnes de {MIN_ACCOUNT_AGE} ans et plus ({MIN_ACCOUNT_AGE} ans est l’âge auquel on peut, en Lituanie, accepter seul des
          services en ligne). Les plus jeunes peuvent jouer en invité. Nous demandons si vous avez 14–17 ans ou 18 ans et plus, pas votre date de naissance. Si nous
          apprenons qu’un compte appartient à une personne de moins de {MIN_ACCOUNT_AGE} ans, nous le supprimons.
        </p>
      </Section>

      <Section id="security" title="Sécurité">
        <p>
          Les connexions sont chiffrées (HTTPS). Les mots de passe et codes de récupération ne sont conservés que sous forme d’empreintes illisibles. Chaque joueur
          ne voit que ses propres données privées. Les connexions sont suspendues après 5 mauvais mots de passe. Dans{' '}
          <strong className={strong}>Paramètres du compte → Sécurité</strong>, vous pouvez activer la double authentification, voir vos dernières connexions et
          déconnecter vos autres appareils.
        </p>
      </Section>

      <Section id="changes" title="Modifications">
        <p>Quand cette politique change, la date en haut change. Nous vous prévenons des changements importants à l’avance, dans le jeu ou par e-mail.</p>
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
          Voici les règles d’utilisation de Bronze : un accord entre vous et <Fill value={OPERATOR.name} /> (« nous »). En créant un compte, vous les acceptez. Pour
          les invités, seules les parties sur le fair-play et sur le jeu fourni « tel quel » s’appliquent.
        </p>
      }
    >
      <Section id="fan-made" title="Un jeu de fans">
        <p>
          Bronze est un jeu de fans inspiré de Brass. Il n’est ni affilié à Roxley Games ou aux auteurs de Brass, ni approuvé par eux. Bronze est gratuit : il n’y a
          rien à acheter et pas de monnaie de jeu.
        </p>
      </Section>

      <Section id="eligibility" title="Qui peut jouer">
        <p>Tout le monde peut jouer contre l’ordinateur en invité. Pour un compte et le jeu en ligne, vous devez avoir au moins {MIN_ACCOUNT_AGE} ans.</p>
      </Section>

      <Section id="accounts" title="Votre compte">
        <Bullets>
          <li>Un compte par personne. Utilisez une adresse e-mail que vous consultez, et gardez votre mot de passe pour vous.</li>
          <li>Vous êtes responsable de ce qui se passe sur votre compte, sauf si quelqu’un y est entré sans faute de votre part.</li>
          <li>Vous pouvez supprimer votre compte à tout moment dans Paramètres → Compte.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Pseudos">
        <p>
          Les pseudos font 3 à 20 lettres, chiffres et tirets bas, et tout le monde les voit. N’en choisissez pas un qui usurpe l’identité de quelqu’un, insulte, est
          haineux ou sexuel, ou fait de la publicité. Si le vôtre enfreint ces règles, nous pouvons vous demander de le changer, ou le changer nous-mêmes.
        </p>
      </Section>

      <Section id="fair-play" title="Fair-play">
        <p>Jouez loyalement et restez aimable. Il est interdit de :</p>
        <Bullets>
          <li>tricher, laisser un programme jouer à votre place en ligne, ou gagner grâce à des bugs (signalez-les-nous plutôt) ;</li>
          <li>quitter exprès une partie pour ne pas perdre, ou jouer avec plusieurs comptes dans une même partie ;</li>
          <li>attaquer le service, les comptes d’autres joueurs ou nos serveurs ;</li>
          <li>harceler, menacer ou insulter d’autres joueurs, ou partager quoi que ce soit d’illégal.</li>
        </Bullets>
        <p>
          Un joueur qui quitte une partie en ligne commencée la perd : un bot termine à sa place et il finit dernier. Vous pouvez signaler un joueur depuis son
          profil.
        </p>
      </Section>

      <Section id="content" title="Le jeu">
        <p>
          L’application Bronze, ses illustrations, ses cartes et son code appartiennent à <Fill value={OPERATOR.name} /> ou à leurs créateurs (voir les{' '}
          <TextLink to={PATHS.credits}>crédits</TextLink>). Vous pouvez y jouer pour votre plaisir, à titre non commercial.
        </p>
      </Section>

      <Section id="termination" title="Si vous enfreignez les règles">
        <p>
          Si vous enfreignez ces règles gravement ou de façon répétée, nous pouvons suspendre ou fermer votre compte. Sauf si ce serait dangereux ou illégal, nous
          vous disons d’abord pourquoi et vous laissons répondre.
        </p>
      </Section>

      <Section id="disclaimers" title="Le jeu « tel quel »">
        <p>
          Bronze est une première version. Nous faisons en sorte qu’il fonctionne et que vos données soient en sécurité, mais les fonctions peuvent changer, et il
          peut être indisponible ou avoir des bugs. Les classements et résultats peuvent être corrigés si un bug ou une triche les a faussés. La progression invité ne
          vit que dans votre navigateur : effacer les données du navigateur la supprime.
        </p>
      </Section>

      <Section id="liability" title="Responsabilité">
        <p>
          Bronze est gratuit. Nous ne sommes pas responsables des pertes indirectes, ni de celles que vous auriez pu éviter. Cela ne limite jamais notre
          responsabilité en cas de décès ou de blessure dus à une négligence, de fraude, de dommage causé volontairement ou par faute lourde, ni pour tout ce que la
          loi ne permet pas de limiter. Vos droits de consommateur restent intacts.
        </p>
      </Section>

      <Section id="law" title="Droit applicable et litiges">
        <p>
          Ces conditions sont régies par le droit lituanien. Si vous êtes un consommateur vivant dans l’UE, le droit de la consommation de votre pays vous protège
          toujours, et vous pouvez saisir ses tribunaux.
        </p>
        <p>
          Contactez-nous d’abord : <Email value={OPERATOR.email} />. Les consommateurs peuvent aussi s’adresser au Service national lituanien de protection des
          droits des consommateurs (Valstybinė vartotojų teisių apsaugos tarnyba,{' '}
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), qui aide à régler les litiges à l’amiable.
        </p>
      </Section>

      <Section id="changes" title="Modifications">
        <p>
          Nous pouvons mettre à jour ces conditions, par exemple à l’arrivée de nouvelles fonctions. Nous vous prévenons des changements importants à l’avance, dans
          le jeu ou par e-mail. Si vous n’êtes pas d’accord, vous pouvez supprimer votre compte.
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
  return (
    <LegalPage
      title="Politique relative aux cookies"
      intro={
        <p>
          Bronze utilise un cookie et quelques entrées dans le stockage de votre navigateur, uniquement pour ce dont Bronze a besoin pour fonctionner. Tous
          appartiennent à Bronze : rien n’est partagé avec d’autres sites, et il n’y a ni publicité, ni statistiques, ni traceurs de réseaux sociaux.
        </p>
      }
    >
      <Section id="essential" title="Seulement le nécessaire">
        <p>
          Tout ce qui suit est indispensable : cela vous garde connecté, conserve votre partie en cours et retient vos réglages et vos choix. La loi ne demande pas
          votre consentement pour ce type de stockage ; Bronze affiche donc une fois un avis, au lieu de vous demander d’accepter ou de refuser.
        </p>
      </Section>

      <Section id="list" title="Tout ce que Bronze stocke">
        <DataTable caption="Cookies et stockage utilisés par Bronze" head={['Nom', 'Type', 'Fournisseur', 'Finalité', 'Durée']} rows={storageRows()} />
      </Section>

      <Section id="choices" title="Tout effacer">
        <p>
          Vous pouvez effacer tout ce que Bronze a stocké dans ce navigateur via Paramètres → Compte → Effacer cet appareil, ou dans les réglages de votre
          navigateur. Vous serez déconnecté, et votre progression invité sera perdue.
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
