/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
import { STORAGE_ITEMS, type DataItem } from '../../../legal/inventory'
import { MIN_ACCOUNT_AGE, OPERATOR, SERVICES } from '../../../legal/operator'
import { DocumentLinks, fileLink, linkClass as link, strongClass as strong } from './shared'
import type { InventoryText, LegalText } from './types'

/* Las páginas legales en español. Es una traducción; si difiere del texto en inglés, prevalece el inglés. */

const UNTIL_DELETED = 'Hasta que elimines tu cuenta'
const CONTRACT = 'Contrato (art. 6.1.b RGPD)'
const SECURITY = 'Interés legítimo en la seguridad (art. 6.1.f RGPD)'
const LOCAL = 'Almacenamiento local'
const SESSION = 'Almacenamiento de sesión'
const LIBRARY = 'Bronze (biblioteca de inicio de sesión de Supabase)'
const UNTIL_CLEARED = 'Hasta que lo borres'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Recuerda que viste el aviso de cookies, con la fecha y la versión de la política.',
      duration: '12 meses, o hasta que cambie la política',
    },
    'bronze.auth': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Mantiene tu sesión iniciada: tus claves de sesión y los datos básicos de la cuenta (ID de cuenta, correo electrónico).',
      duration: 'Hasta que cierres sesión; sin «Recordarme», hasta que cierres el navegador',
    },
    'bronze.auth-code-verifier': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Un secreto de un solo uso que completa de forma segura el inicio de sesión con Google o con un enlace por correo.',
      duration: 'Se elimina tras usarse',
    },
    'bronze.auth-user': {
      where: LOCAL,
      provider: LIBRARY,
      purpose: 'Datos de la cuenta que algunas versiones de la biblioteca de inicio de sesión guardan junto a la sesión.',
      duration: 'Hasta que cierres sesión',
    },
    'bronze.auth.remember': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Si marcaste «Recordarme» al iniciar sesión.',
      duration: 'Hasta el siguiente inicio de sesión',
    },
    bronze_session_alive: {
      where: 'Cookie',
      provider: 'Bronze',
      purpose: 'Indica a Bronze que se cerró el navegador, para que termine una sesión iniciada sin «Recordarme». Solo guarda el valor 1.',
      duration: 'Hasta que cierres el navegador (cookie de sesión)',
    },
    'bronze.auth.returnTo': {
      where: SESSION,
      provider: 'Bronze',
      purpose: 'La página a la que volver tras iniciar sesión con Google.',
      duration: 'Solo esta pestaña; se elimina tras iniciar sesión',
    },
    'bronze.auth.failures': {
      where: SESSION,
      provider: 'Bronze',
      purpose: 'Cuenta las contraseñas incorrectas para pausar los inicios de sesión 30 segundos tras 5 fallos (seguridad).',
      duration: 'Solo esta pestaña',
    },
    'bronze.match': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Tu partida en curso, para que «Continuar» la reanude donde la dejaste.',
      duration: 'Hasta que la partida termine o la abandones',
    },
    'bronze.stats.pending.<id>': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Las partidas terminadas de tu cuenta (y tus estadísticas de invitado) hasta que el servidor confirme que cada una se guardó, para no perder nada si se corta la conexión.',
      duration: 'Se elimina una vez guardada',
    },
    'bronze.boardDraft.v2': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Cambios sin guardar en el editor de mapas (#/board?edit=1). Solo se crea si usas el editor.',
      duration: 'Hasta que los restablezcas',
    },
    'bronze.settings': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Tus ajustes: idioma, sonido, volumen, velocidad de las animaciones y del ordenador, temporizador de turno, registro de la partida.',
      duration: UNTIL_CLEARED,
    },
    'bronze.lobby.gameMode': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'El último modo de juego que elegiste.',
      duration: UNTIL_CLEARED,
    },
    'bronze.lobby.map': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'El último mapa que elegiste.',
      duration: UNTIL_CLEARED,
    },
    'bronze.setup': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Los puestos de la última partida que configuraste: nombres, colores y niveles del ordenador.',
      duration: UNTIL_CLEARED,
    },
    'bronze.stats': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Tus estadísticas y logros como invitado (se pasan a tu cuenta al iniciar sesión).',
      duration: 'Hasta que los borres o inicies sesión',
    },
  },
  account: [
    {
      what: 'Dirección de correo electrónico',
      why: 'Para que puedas iniciar sesión, y para los correos de la cuenta (confirmar tu dirección, restablecer la contraseña, avisos de seguridad cuando cambian tu contraseña, tu correo o tu verificación en dos pasos).',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Contraseña',
      why: 'Para que puedas iniciar sesión. Supabase solo guarda un hash irreversible; nadie puede leerla.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    { what: 'Nombre de usuario', why: 'Tu nombre en el juego. Cualquiera puede verlo, sean cuales sean tus ajustes de privacidad.', basis: CONTRACT, retention: UNTIL_DELETED },
    {
      what: 'Nombres de usuario anteriores, y cuándo los cambiaste',
      why: 'Para que los enlaces a tu nombre anterior lleven a tu perfil durante 30 días y nadie más pueda quedárselo (y hacerse pasar por ti) en ese tiempo.',
      basis: 'Interés legítimo en evitar la suplantación (art. 6.1.f RGPD)',
      retention: '30 días',
    },
    {
      what: 'Datos de perfil que decides añadir: biografía, país, avatar (uno predefinido o una imagen que subes); y tus ajustes de privacidad',
      why: 'Se muestran en tu perfil a quien permitan tus ajustes de privacidad.',
      basis: CONTRACT,
      retention: 'Hasta que los cambies o elimines tu cuenta',
    },
    {
      what: 'Datos de la cuenta de Google (nombre, correo, foto de perfil, ID de Google), solo si inicias sesión con Google',
      why: 'Para iniciar sesión con Google. El nombre sirve para sugerir un nombre de usuario; la foto es tu avatar, que ven los demás jugadores.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Confirmación de edad: si tienes 14–17 o 18 o más años (no la fecha de nacimiento)',
      why: 'Las cuentas son solo para mayores de 14 años; a los menores de 18 no se les envían correos de marketing.',
      basis: 'Obligación legal (arts. 6.1.c y 8 RGPD)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Registros de consentimiento: qué aceptaste (Condiciones, Política de privacidad, correos de marketing), versión y fecha',
      why: 'Para poder demostrar qué aceptaste, como exige la ley.',
      basis: 'Obligación legal (arts. 6.1.c y 7.1 RGPD)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Preferencias de correo (marketing, amigos y torneos; todas desactivadas hasta que las actives)',
      why: 'Para enviarte solo los correos que quieras y que puedas darte de baja con un clic.',
      basis: 'Consentimiento para el marketing (art. 6.1.a RGPD); contrato para el resto (6.1.b)',
      retention: UNTIL_DELETED,
    },
    {
      what: 'Estadísticas de juego: partidas, victorias, mejor puntuación, mercancías entregadas, mapas jugados, logros y cuándo se desbloquearon, fecha de alta; un identificador aleatorio por cada resultado guardado',
      why: 'Tu perfil y tus logros, visibles para quien permitan tus ajustes de privacidad. Los identificadores garantizan que un resultado enviado dos veces cuente una sola vez.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Historial de partidas: de cada partida terminada, cuándo, el mapa y el modo de juego, cuántos jugadores, tu puesto, tu puntuación, las mercancías entregadas, los enlaces y las industrias construidos',
      why: 'Tus últimas partidas y estadísticas en tu perfil, visibles para quien permitan tus ajustes de privacidad.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Partidas en línea: qué partidas jugaste, tu puesto, cada jugada que hiciste y cuándo, el resultado, y tu reloj y tu conexión durante la partida',
      why: 'Para llevar las partidas en línea: comprobar cada jugada, mantener el juego limpio, mostrar la partida a sus jugadores (y a los espectadores de partidas públicas) y poder repetirla.',
      basis: CONTRACT,
      retention: 'Mientras se conserve la partida. Si eliminas tu cuenta, tu puesto muestra «Jugador eliminado» y deja de estar vinculado a ti; las jugadas se quedan para que los demás jugadores conserven su partida.',
    },
    {
      what: 'Puntuaciones: tu puntuación en cada mapa, su fiabilidad, partidas jugadas, tu mejor marca y cada cambio tras una partida puntuada',
      why: 'Para emparejar jugadores de nivel parecido y mostrar puntuaciones en los perfiles y en la clasificación.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Amigos: los jugadores que añadiste, las solicitudes de amistad enviadas o recibidas y las invitaciones a partidas',
      why: 'Tu lista de amigos, solicitudes e invitaciones a partidas.',
      basis: CONTRACT,
      retention: 'Hasta que tú o tu amigo la quitéis, o uno de los dos elimine su cuenta. Una invitación desaparece al usarse o cuando empieza la partida.',
    },
    {
      what: 'Estado en línea: cuándo habló tu aplicación con el servidor del juego por última vez',
      why: 'Para mostrar a tus amigos si estás en línea (visto en los últimos 2 minutos).',
      basis: CONTRACT,
      retention: 'Se sustituye cada vez; se elimina con tu cuenta',
    },
    {
      what: 'Partida rápida: tu puntuación y el tipo de partida que buscas, mientras esperas',
      why: 'Para encontrarte jugadores de nivel parecido.',
      basis: CONTRACT,
      retention: 'Hasta que encuentres rivales o dejes de esperar',
    },
    {
      what: 'Verificación en dos pasos, solo si la activas: la clave de la app de autenticación (la guarda Supabase) y tus códigos de recuperación (guardados solo como hashes irreversibles)',
      why: 'Para pedir un código de tu teléfono al iniciar sesión, y dejarte entrar con un código de recuperación si lo pierdes.',
      basis: CONTRACT,
      retention: 'Hasta que la desactives o elimines tu cuenta',
    },
    {
      what: 'Denuncias: cuando denuncias a un jugador o un jugador te denuncia a ti: a quién, el motivo, la nota y cuándo',
      why: 'Para revisar trampas, nombres ofensivos, acoso y spam, y mantener el juego limpio y seguro.',
      basis: 'Interés legítimo en un juego seguro (art. 6.1.f RGPD)',
      retention: '12 meses; menos si se elimina la cuenta denunciada',
    },
    {
      what: 'Contadores contra abusos: el identificador de tu cuenta (o, antes de iniciar sesión, tu dirección IP), qué acción y cuántos intentos',
      why: 'Para limitar cuántas veces se pueden probar contraseñas, códigos, comprobaciones de nombre de usuario y denuncias, contra adivinanzas y spam.',
      basis: SECURITY,
      retention: 'Se eliminan al cabo de un día',
    },
    {
      what: 'Contador de inicios de sesión fallidos: el nombre de usuario intentado, cuántas contraseñas incorrectas y cuándo',
      why: 'Para pausar los inicios de sesión 30 segundos tras 5 contraseñas incorrectas, contra quien intente adivinarlas.',
      basis: SECURITY,
      retention: 'Se borra al iniciar sesión correctamente; si no, se elimina al cabo de un día',
    },
    {
      what: 'Eventos de inicio de sesión que guarda Supabase (hora, dirección IP, navegador)',
      why: 'Seguridad del servicio de inicio de sesión, y tu lista de inicios de sesión recientes en Ajustes de la cuenta → Seguridad (solo la ves tú).',
      basis: SECURITY,
      retention: SERVICES.authLogRetention,
    },
  ],
  visitor: [
    {
      what: 'Registros del servidor del proveedor de alojamiento (dirección IP, páginas solicitadas, navegador, hora)',
      why: 'Para que el sitio funcione y sea seguro.',
      basis: 'Interés legítimo (art. 6.1.f RGPD)',
      retention: SERVICES.hostingLogRetention,
    },
  ],
  recipients: [
    {
      name: 'Supabase, Inc.',
      role: 'Encargado del tratamiento: base de datos, inicio de sesión y correos de la cuenta',
      data: 'Todos los datos de la cuenta indicados arriba',
      location: `Región del proyecto: ${SERVICES.supabaseRegion}. Supabase es una empresa estadounidense.`,
    },
    {
      name: 'Google (para personas en el EEE: Google Ireland Limited)',
      role: 'Responsable independiente, solo si eliges «Continuar con Google»',
      data: 'Google confirma tu identidad y envía a Bronze tu nombre, tu correo y tu foto',
      location: 'Consulta la política de privacidad de Google',
    },
    {
      name: SERVICES.hosting,
      role: 'Encargado del tratamiento: aloja los archivos del sitio',
      data: 'Registros del servidor (dirección IP, páginas solicitadas, navegador)',
      location: SERVICES.hosting,
    },
    { name: SERVICES.emailProvider, role: 'Encargado del tratamiento: envía los correos de la cuenta', data: 'Dirección de correo y contenido del correo', location: SERVICES.emailProvider },
    {
      name: 'Otros jugadores y visitantes',
      role: 'Ven tu perfil, en la medida en que lo permitan tus ajustes de privacidad',
      data: 'Siempre tu nombre de usuario y avatar. Con un perfil público (o «Solo amigos», para tus amigos), también tu biografía, país, historial, puntuaciones, últimas partidas y fecha de registro. En partidas en línea, tu puesto, tus jugadas y tu resultado (para sus jugadores y los espectadores de partidas públicas). Tus amigos ven cuándo estás en línea. Una puntuación asentada aparece en la clasificación.',
      location: 'Dondequiera que se juegue a Bronze',
    },
  ],
}

const HEAD = ['Qué', 'Por qué', 'Base jurídica', 'Cuánto tiempo']
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
      title="Política de privacidad"
      intro={<p>Esta página explica con palabras sencillas qué sabe Bronze de ti, por qué, quién más lo ve y qué puedes hacer al respecto.</p>}
    >
      <Section id="short" title="En resumen">
        <Bullets>
          <li>Puedes jugar contra el ordenador como invitado. Así no se nos envía nada sobre ti.</li>
          <li>Una cuenta necesita un correo, una contraseña (o Google) y un nombre de usuario. Todo lo demás lo decides tú.</li>
          <li>Las partidas en línea guardan cada jugada, para que el juego sea limpio y las partidas se puedan repetir.</li>
          <li>Sin anuncios, sin analítica, sin rastreo. Nunca vendemos tus datos.</li>
          <li>
            En <strong className={strong}>Ajustes → Cuenta</strong> puedes descargar en cualquier momento todo lo que tenemos sobre ti, o eliminar tu cuenta.
          </li>
        </Bullets>
      </Section>

      <Section id="controller" title="Quiénes somos">
        <p>
          Bronze lo gestiona <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />), <Fill value={OPERATOR.address} />, código de empresa{' '}
          <Fill value={OPERATOR.companyNumber} />. Decidimos cómo se usan tus datos (somos el «responsable del tratamiento»). Preguntas sobre tus datos:{' '}
          <Email value={OPERATOR.email} />. Más en los <TextLink to={PATHS.legal}>datos de la empresa</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Jugar como invitado">
        <p>
          Como invitado juegas contra el ordenador en tu navegador. Tu partida, ajustes e historial se quedan en el almacenamiento del navegador (consulta la{' '}
          <TextLink to={PATHS.cookies}>Política de cookies</TextLink>). Como cualquier web, nuestro proveedor de alojamiento ve algunos datos técnicos:
        </p>
        <DataTable caption="Datos de todos los visitantes" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Qué guardamos si tienes cuenta">
        <p>Solo guardamos lo que Bronze necesita. Nunca pedimos tu fecha de nacimiento, tu dirección ni tu ubicación. La biografía, el país y la foto son opcionales.</p>
        <DataTable caption="Datos de los titulares de cuenta" head={HEAD} rows={dataRows(inventory.account)} />
        <p>
          La «base jurídica» es la norma del RGPD (la ley europea de protección de datos) que permite cada uso. «Contrato» significa que lo necesitamos para darte el
          juego en el que te registraste.
        </p>
      </Section>

      <Section id="online" title="Jugar en línea">
        <Bullets>
          <li>Nuestro servidor comprueba y guarda cada jugada de una partida en línea. Los jugadores de la partida, y los espectadores de las partidas públicas, ven el tablero, los nombres y las jugadas. Nadie más ve tus cartas.</li>
          <li>Las partidas terminadas pueden repetirlas sus jugadores, y las públicas cualquiera.</li>
          <li>Las partidas puntuadas cambian tu puntuación. Aparece en tu perfil y, una vez asentada (tras 10 partidas puntuadas), en la clasificación.</li>
          <li>Tus amigos ven cuándo estás en línea, es decir, cuándo tu aplicación habló con nuestro servidor en los últimos 2 minutos.</li>
          <li>
            Eliges quién ve tu perfil y tu historial en <strong className={strong}>Ajustes de la cuenta → Privacidad</strong>: <strong className={strong}>Público</strong>{' '}
            (cualquiera), <strong className={strong}>Solo amigos</strong> o <strong className={strong}>Privado</strong> (solo tú). Tu nombre de usuario y tu foto siempre
            se ven; tu correo, nunca. Las cuentas de menores de 18 años empiezan en «Solo amigos».
          </li>
        </Bullets>
      </Section>

      <Section id="recipients" title="Quién más ve tus datos">
        <p>Estas empresas nos ayudan a gestionar Bronze. Solo pueden usar tus datos para ese trabajo (son «encargados del tratamiento»), salvo Google.</p>
        <DataTable
          caption="Destinatarios de datos personales"
          head={['Quién', 'Función', 'Qué', 'Dónde']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <p>
          Supabase es una empresa estadounidense. Cuando tus datos salen del Espacio Económico Europeo, los protegen <Fill value={SERVICES.transferSafeguards} />.
          Puedes pedirnos una copia.
        </p>
      </Section>

      <Section id="rights" title="Tus derechos">
        <Bullets>
          <li>
            <strong className={strong}>Ver y llevarte tus datos</strong>: <strong className={strong}>Ajustes → Cuenta → Descargar mis datos</strong> te da un archivo
            (JSON) con todo lo anterior: cuenta, perfil, historial, partidas en línea con tus jugadas, puntuaciones, amigos e invitaciones.
          </li>
          <li>
            <strong className={strong}>Eliminarlos</strong>: <strong className={strong}>Ajustes → Cuenta → Eliminar mi cuenta</strong>. Escribes tu nombre de usuario para
            confirmar y todo se elimina al momento. Las partidas en línea que jugaste se quedan para los demás jugadores, con «Jugador eliminado» en tu puesto y sin
            relación contigo. Las copias de seguridad se sobrescriben en <Fill value={SERVICES.backupRetention} />.
          </li>
          <li>
            <strong className={strong}>Corregirlos</strong>: en los ajustes de la cuenta, o pidiéndonoslo.
          </li>
          <li>
            <strong className={strong}>Oponerte o pedir que limitemos</strong> lo que hacemos con ellos cuando nos basamos en el «interés legítimo».
          </li>
          <li>
            <strong className={strong}>Retirar tu consentimiento</strong> (por ejemplo, a los correos opcionales) en <strong className={strong}>Ajustes → Notificaciones</strong>.
          </li>
          <li>
            <strong className={strong}>Reclamar</strong> ante la autoridad lituana de protección de datos, la Inspección Estatal de Protección de Datos (Valstybinė
            duomenų apsaugos inspekcija, <span lang="lt">L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ), o ante la de tu país (en España, la AEPD).
          </li>
        </Bullets>
        <p>
          ¿No puedes iniciar sesión? Usa la <TextLink to={PATHS.dataRequest}>página de solicitudes de datos</TextLink> o escribe a <Email value={OPERATOR.email} />.
          Respondemos en 30 días. Una solicitud complicada puede tardar hasta dos meses más; en ese caso te diremos por qué durante el primer mes. Podemos pedirte que
          confirmes desde el correo de la cuenta, para que nadie más obtenga tus datos.
        </p>
      </Section>

      <Section id="emails" title="Correos">
        <p>
          Enviamos los correos que necesita tu cuenta: confirmar tu dirección, restablecer la contraseña y un aviso cuando cambian tu contraseña, tu correo o la
          verificación en dos pasos. Todo lo demás (como novedades) solo si lo activas, y nunca a menores de 18 años. Cada correo opcional tiene un enlace para darse
          de baja.
        </p>
      </Section>

      <Section id="children" title="Menores">
        <p>
          Las cuentas son para personas de {MIN_ACCOUNT_AGE} años o más ({MIN_ACCOUNT_AGE} es la edad a la que en Lituania se puede aceptar por uno mismo un servicio en
          línea). Los más jóvenes pueden jugar como invitados. Preguntamos si tienes 14–17 o 18 o más, no tu fecha de nacimiento. Si sabemos que una cuenta es de
          alguien menor de {MIN_ACCOUNT_AGE} años, la eliminamos.
        </p>
      </Section>

      <Section id="security" title="Seguridad">
        <p>
          Las conexiones van cifradas (HTTPS). Las contraseñas y los códigos de recuperación solo se guardan como hashes que nadie puede leer. Cada jugador ve solo sus
          propios datos privados. Los inicios de sesión se pausan tras 5 contraseñas incorrectas. En <strong className={strong}>Ajustes de la cuenta → Seguridad</strong>{' '}
          puedes activar la verificación en dos pasos, ver tus inicios de sesión recientes y cerrar la sesión en otros dispositivos.
        </p>
      </Section>

      <Section id="changes" title="Cambios">
        <p>Cuando esta política cambia, cambia la fecha de arriba. Te avisamos de los cambios importantes antes de que se apliquen, en el juego o por correo.</p>
      </Section>
    </LegalPage>
  )
}

function TermsOfService() {
  return (
    <LegalPage
      title="Condiciones del servicio"
      intro={
        <p>
          Estas son las normas para usar Bronze: un acuerdo entre tú y <Fill value={OPERATOR.name} /> («nosotros»). Al crear una cuenta, las aceptas. A los
          invitados solo se les aplican las partes sobre el juego limpio y sobre el juego ofrecido «tal cual».
        </p>
      }
    >
      <Section id="fan-made" title="Un juego hecho por fans">
        <p>
          Bronze es un juego hecho por fans inspirado en Brass. No está afiliado a Roxley Games ni a los autores de Brass, ni cuenta con su respaldo. Bronze es
          gratuito: no hay nada que comprar ni dinero dentro del juego.
        </p>
      </Section>

      <Section id="eligibility" title="Quién puede jugar">
        <p>Cualquiera puede jugar contra el ordenador como invitado. Para tener cuenta y jugar en línea debes tener al menos {MIN_ACCOUNT_AGE} años.</p>
      </Section>

      <Section id="accounts" title="Tu cuenta">
        <Bullets>
          <li>Una cuenta por persona. Usa un correo que leas y no compartas tu contraseña.</li>
          <li>Eres responsable de lo que pasa en tu cuenta, salvo que alguien entrara sin culpa tuya.</li>
          <li>Puedes eliminar tu cuenta cuando quieras en Ajustes → Cuenta.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Nombres de usuario">
        <p>
          Los nombres de usuario tienen de 3 a 20 letras, números y guiones bajos, y todos pueden verlos. No elijas uno que se haga pasar por otra persona, insulte,
          sea de odio o sexual, o anuncie algo. Si el tuyo incumple estas normas, podemos pedirte que lo cambies o cambiarlo nosotros.
        </p>
      </Section>

      <Section id="fair-play" title="Juego limpio">
        <p>Juega limpio y sé amable. No está permitido:</p>
        <Bullets>
          <li>hacer trampas, dejar que un programa juegue por ti en partidas en línea o ganar aprovechando fallos (mejor avísanos);</li>
          <li>abandonar partidas a propósito para no perder, o jugar con varias cuentas en la misma partida;</li>
          <li>atacar el servicio, las cuentas de otros jugadores o nuestros servidores;</li>
          <li>acosar, amenazar o insultar a otros jugadores, o compartir algo ilegal.</li>
        </Bullets>
        <p>
          Quien abandona una partida en línea ya empezada la pierde: un bot termina su puesto y queda último. Puedes denunciar a un jugador desde su perfil.
        </p>
      </Section>

      <Section id="content" title="El juego">
        <p>
          La aplicación Bronze, sus ilustraciones, mapas y código pertenecen a <Fill value={OPERATOR.name} /> o a quienes los crearon (consulta los{' '}
          <TextLink to={PATHS.credits}>créditos</TextLink>). Puedes jugar por diversión, sin fines comerciales.
        </p>
      </Section>

      <Section id="termination" title="Si incumples las normas">
        <p>
          Si incumples estas normas de forma grave o repetida, podemos suspender o cerrar tu cuenta. Salvo que fuera peligroso o ilegal, antes te diremos por qué y te
          dejaremos responder.
        </p>
      </Section>

      <Section id="disclaimers" title="El juego «tal cual»">
        <p>
          Bronze es una versión temprana. Trabajamos para que funcione y tus datos estén seguros, pero las funciones pueden cambiar y puede fallar o tener errores. Las
          puntuaciones y resultados pueden corregirse si un error o una trampa los afectó. El progreso de invitado vive solo en tu navegador: si borras sus datos, se
          pierde.
        </p>
      </Section>

      <Section id="liability" title="Responsabilidad">
        <p>
          Bronze es gratuito. No respondemos de pérdidas indirectas ni de las que pudiste evitar. Esto nunca limita nuestra responsabilidad por muerte o lesiones por
          negligencia, por fraude, por daños causados a propósito o por negligencia grave, ni por nada que la ley no permita limitar. Tus derechos como consumidor no
          cambian.
        </p>
      </Section>

      <Section id="law" title="Ley y conflictos">
        <p>
          Estas condiciones se rigen por la ley lituana. Si eres un consumidor que vive en la UE, te sigue protegiendo la ley de consumo de tu país y puedes acudir a
          sus tribunales.
        </p>
        <p>
          Habla primero con nosotros: <Email value={OPERATOR.email} />. Los consumidores también pueden acudir al Servicio Estatal lituano de Protección de los
          Derechos de los Consumidores (Valstybinė vartotojų teisių apsaugos tarnyba,{' '}
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), que ayuda a resolver conflictos fuera de los tribunales.
        </p>
      </Section>

      <Section id="changes" title="Cambios">
        <p>
          Podemos actualizar estas condiciones, por ejemplo cuando lleguen funciones nuevas. Te avisamos de los cambios importantes antes de que se apliquen, en el
          juego o por correo. Si no estás de acuerdo, puedes eliminar tu cuenta.
        </p>
      </Section>

      <Section id="contact" title="Contacto">
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
      title="Política de reembolsos"
      intro={
        <p>
          Bronze es gratuito. No hay nada que comprar con dinero real, ni moneda del juego que comprar o ganar. La tienda aún no está abierta, así que no hay nada
          que reembolsar.
        </p>
      }
    >
      <Section id="future" title="Si empezamos a vender">
        <p>
          Antes de vender nada, esta página expondrá tus derechos, incluido el derecho de desistimiento de 14 días de la UE y cómo se aplica al contenido digital,
          y el precio total de cada artículo se mostrará antes de pagar.
        </p>
      </Section>
      <Section id="contact" title="Preguntas">
        <p>
          Escribe a <Email value={OPERATOR.email} />.
        </p>
      </Section>
    </LegalPage>
  )
}

function CookiePolicy() {
  return (
    <LegalPage
      title="Política de cookies"
      intro={
        <p>
          Bronze usa una cookie y algunas entradas en el almacenamiento de tu navegador, solo para lo que Bronze necesita para funcionar. Todas son de Bronze: no se
          comparte nada con otras webs y no hay anuncios, analítica ni rastreadores de redes sociales.
        </p>
      }
    >
      <Section id="essential" title="Solo lo necesario">
        <p>
          Todo lo de abajo es imprescindible: mantiene tu sesión iniciada, guarda tu partida en curso y recuerda tus ajustes y elecciones. La ley no pide tu
          consentimiento para este tipo de almacenamiento, así que Bronze muestra un aviso una vez en lugar de pedirte que aceptes o rechaces.
        </p>
      </Section>

      <Section id="list" title="Todo lo que guarda Bronze">
        <DataTable caption="Cookies y almacenamiento de Bronze" head={['Nombre', 'Tipo', 'Proveedor', 'Finalidad', 'Cuánto tiempo']} rows={storageRows()} />
      </Section>

      <Section id="choices" title="Borrarlo">
        <p>
          Puedes borrar todo lo que Bronze guardó en este navegador en Ajustes → Cuenta → Borrar este dispositivo, o en los ajustes de tu navegador. Se cerrará tu
          sesión y perderás tu progreso de invitado.
        </p>
        <p>
          Más sobre tus datos: <TextLink to={PATHS.privacy}>Política de privacidad</TextLink>.
        </p>
      </Section>
    </LegalPage>
  )
}

function LegalNotice() {
  const t = useT()
  const details: [string, string][] = [
    ['Titular', OPERATOR.name],
    ['Forma jurídica', OPERATOR.legalForm],
    ['Dirección', OPERATOR.address],
    ['Correo', OPERATOR.email],
    ['Código de empresa', OPERATOR.companyNumber],
    ['NIF-IVA', OPERATOR.vatNumber],
    ['Sitio web', OPERATOR.siteUrl],
    ['Alojamiento', SERVICES.hosting],
  ]
  return (
    <LegalPage title="Datos de la empresa">
      <Section id="operator" title="Quién gestiona Bronze">
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
          {details.map(([term, value]) => (
            <div key={term} className="contents">
              <dt className="font-display font-bold tracking-[0.08em] text-parchment-100 uppercase">{term}</dt>
              <dd className="mb-2 sm:mb-0">{value === OPERATOR.email ? <Email value={value} /> : <Fill value={value} />}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-parchment-300">
          Si el titular no está registrado a efectos del IVA, se puede quitar la línea del IVA. Omite cualquier línea que no corresponda.
        </p>
      </Section>

      <Section id="documents" title="Páginas legales">
        <DocumentLinks credits="Créditos y licencias" label={(key) => t.nav[key]} />
      </Section>
    </LegalPage>
  )
}

function Credits() {
  return (
    <LegalPage
      ornate
      title="Créditos"
      intro={
        <p>
          Bronze es un juego de estrategia original de la era industrial, creado por <Fill value={OPERATOR.name} />. Se apoya en el trabajo de otras personas,
          que se citan a continuación.
        </p>
      }
    >
      <Section id="fonts" title="Tipografías">
        <DataTable
          caption="Tipografías"
          head={['Tipografía', 'Autor', 'Licencia']}
          rows={[
            ['Cinzel', 'Copyright 2020 The Cinzel Project Authors (github.com/NDISCOVER/Cinzel)', fileLink('licenses/OFL-cinzel.txt', 'SIL Open Font License 1.1')],
            ['Barlow', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow.txt', 'SIL Open Font License 1.1')],
            ['Barlow Condensed', 'Copyright 2017 The Barlow Project Authors (github.com/jpt/barlow)', fileLink('licenses/OFL-barlow-condensed.txt', 'SIL Open Font License 1.1')],
          ]}
        />
        <p className="text-sm">Las tipografías se sirven desde los propios archivos de Bronze (empaquetadas por Fontsource), no se cargan desde Google ni desde otro servidor.</p>
      </Section>

      <Section id="art" title="Arte y sonido">
        <DataTable
          caption="Arte y sonido"
          head={['Qué', 'Hecho por']}
          rows={[
            [
              'El mapa pintado, los iconos de industrias, las texturas de las rutas, las fichas de enlace y los hexágonos, las imágenes de los centros comerciales, los paneles del vestíbulo y los botones de latón',
              <>
                <Fill value={OPERATOR.name} />, con herramientas de generación de imágenes por IA
              </>,
            ],
            ['Pinturas de fondo', 'Generadas con IA para Bronze'],
            ['Logotipo y ornamentos', 'Creados para Bronze'],
            ['Iconos de la interfaz', 'Dibujados para Bronze'],
            ['La «G» del botón de inicio de sesión', 'El logotipo de Google, marca de Google LLC, usado en el botón de inicio de sesión como piden las directrices de Google'],
            ['Efectos de sonido y música', 'Se generan en tu navegador mientras juegas (Web Audio): sin grabaciones'],
          ]}
        />
      </Section>

      <Section id="software" title="Software">
        <p>
          Bronze está hecho con React, React Router, el cliente JavaScript de Supabase, Tailwind CSS y Vite, todos con licencia MIT, y algunos paquetes de código
          abierto más pequeños. La lista completa, con cada texto de licencia: {fileLink('THIRD_PARTY_NOTICES.txt', 'Avisos de terceros')} (en inglés).
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
    title: 'Solicitudes de datos',
    intro: (
      <p>
        Si puedes iniciar sesión, lo más rápido es hacerlo en el juego: en Ajustes → Cuenta tienes <strong>Descargar mis datos</strong> y{' '}
        <strong>Eliminar mi cuenta</strong>. Si no puedes iniciar sesión, pídenoslo aquí.
      </p>
    ),
    howTitle: 'Cómo funciona',
    how: [
      'Respondemos en un plazo de 30 días (un mes). En solicitudes complejas puede ampliarse dos meses; te lo diremos dentro del primer mes.',
      'Para proteger tu cuenta, responderemos a la dirección de correo de la cuenta y podemos pedirte que confirmes la solicitud desde ella.',
    ],
    rights: (policy) => <>Tus derechos se explican en la {policy}.</>,
    formTitle: 'Hacer una solicitud',
    formIntro: (email) => <>Este formulario redacta un correo a {email} para que lo envíes desde tu propia aplicación de correo. No se envía nada hasta que lo envíes tú.</>,
    noAddress: 'La dirección de correo del titular aún no está indicada, así que este formulario no se puede enviar.',
    what: '¿Qué necesitas?',
    requests: {
      access: 'Una copia de mis datos (acceso / portabilidad)',
      erasure: 'Eliminar mi cuenta y mis datos',
      rectification: 'Rectificar mis datos',
      objection: 'Oponerme al tratamiento o limitarlo',
      other: 'Otra cosa',
    },
    email: 'El correo de tu cuenta',
    emailError: 'Escribe el correo de tu cuenta de Bronze, para que podamos encontrarla y responderte.',
    username: 'Nombre de usuario (opcional)',
    details: 'Detalles (opcional)',
    submit: 'Redactar el correo',
    subject: (request) => `Solicitud de datos de Bronze: ${request}`,
    body: (request, email, username, details) => [`Solicitud: ${request}`, `Correo de la cuenta: ${email}`, `Nombre de usuario: ${username}`, '', details].join('\n'),
    notGiven: '(no indicado)',
  },
  unsubscribe: {
    title: 'Darse de baja',
    lists: { marketing: 'novedades de Bronze', friends: 'correos de amigos', tournaments: 'correos de torneos', all: 'ningún correo opcional' },
    done: 'Te has dado de baja',
    working: 'Dando de baja…',
    failed: 'No se pudo dar de baja',
    doneBody: (list) => `Ya no recibirás ${list}. Los correos que ya están en camino pueden tardar unos minutos en llegar.`,
    workingBody: 'Un momento…',
    notFoundBody: 'Este enlace para darse de baja no es válido. Puede que se copiara incompleto.',
    failedBody: 'Algo ha fallado. Vuelve a probar el enlace dentro de un minuto.',
    unavailableBody: 'Las cuentas no están configuradas en este sitio, así que no hay correos de los que darse de baja.',
    more: (l) => <>Con la sesión iniciada, puedes cambiar todas tus elecciones de correo en Ajustes → Notificaciones. Preguntas: {l}.</>,
    dataRequests: 'solicitudes de datos',
  },
}

export default legal
