/* oxlint-disable react/only-export-components -- a lazily loaded bundle of page text, not a component module */
import { Bullets, DataTable, Email, Fill, LegalPage, Section, Sub, TextLink } from '../../../components/legal/LegalPage'
import { PATHS } from '../../../data/navigation'
import { useT } from '../../../i18n'
import { consentStore } from '../../../legal/consent'
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
const UNTIL_CLEARED = 'Hasta que lo borres o retires el consentimiento'

const inventory: InventoryText = {
  storage: {
    'bronze.consent': {
      where: LOCAL,
      provider: 'Bronze',
      purpose: 'Recuerda tus elecciones sobre cookies, cuándo las hiciste y para qué versión de la política.',
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
    __stripe_mid: {
      where: 'Cookie',
      provider: 'Stripe',
      purpose: 'Solo si inicias una verificación de tarjeta: la pone el formulario de tarjeta de Stripe para reconocer el dispositivo y prevenir el fraude.',
      duration: '1 año',
    },
    __stripe_sid: {
      where: 'Cookie',
      provider: 'Stripe',
      purpose: 'Solo si inicias una verificación de tarjeta: la pone el formulario de tarjeta de Stripe para prevenir el fraude durante la verificación.',
      duration: '30 minutos',
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
    'bronze.boardDraft': {
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
      duration: 'Hasta que los borres, retires el consentimiento o inicies sesión',
    },
  },
  categories: [
    { id: 'essential', title: 'Esenciales', description: 'Mantienen tu sesión, guardan tu partida en curso y recuerdan tus elecciones sobre cookies. Siempre activas.' },
    {
      id: 'preferences',
      title: 'Preferencias',
      description: 'Recuerdan en este dispositivo tus ajustes, el último modo de juego, el mapa, los puestos y tus estadísticas de invitado.',
    },
    { id: 'analytics', title: 'Analítica', description: 'Bronze no usa analítica hoy. Si alguna vez lo hace, solo funcionará si la activas.' },
    {
      id: 'marketing',
      title: 'Marketing',
      description: 'Bronze no usa rastreadores publicitarios ni de marketing hoy. Si alguna vez lo hace, solo funcionarán si los activas.',
    },
  ],
  account: [
    {
      what: 'Dirección de correo electrónico',
      why: 'Para que puedas iniciar sesión, y para los correos de la cuenta (confirmar tu dirección, restablecer la contraseña, avisos de seguridad cuando cambian tu contraseña, tu correo, tu teléfono o tu verificación en dos pasos).',
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
      what: 'Verificación en dos pasos, solo si la activas: la clave de la app de autenticación (la guarda Supabase) y tus códigos de recuperación (guardados solo como hashes irreversibles)',
      why: 'Para pedir un código de tu teléfono al iniciar sesión, y dejarte entrar con un código de recuperación si lo pierdes.',
      basis: CONTRACT,
      retention: 'Hasta que la desactives o elimines tu cuenta',
    },
    {
      what: 'Número de teléfono, solo si verificas uno',
      why: 'Para mostrar la insignia «Teléfono verificado» en tu perfil y, si quieres, enviarte los códigos de verificación en dos pasos por SMS. Solo tú ves el número.',
      basis: CONTRACT,
      retention: UNTIL_DELETED,
    },
    {
      what: 'Verificación de tarjeta, solo si verificas una tarjeta: que está verificada, cuándo, la marca de la tarjeta y sus 4 últimos dígitos (nunca el número de la tarjeta)',
      why: 'Para mostrar la insignia «Jugador verificado», como señal de que eres una persona real. No se cobra nada. Escribes la tarjeta en el formulario de Stripe; nunca nos llega.',
      basis: CONTRACT,
      retention: 'Hasta que quites la verificación o elimines tu cuenta',
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
      name: 'Stripe (Stripe Payments Europe, Limited, para personas en el EEE)',
      role: 'Solo si verificas una tarjeta: encargado del tratamiento para la verificación, y responsable independiente de su propia prevención del fraude y obligaciones legales',
      data: 'Los datos de la tarjeta que escribes en el formulario de Stripe, datos de tu dispositivo y navegador, y el identificador de tu cuenta',
      location: 'Irlanda y Estados Unidos; consulta la política de privacidad de Stripe',
    },
    {
      name: SERVICES.smsProvider,
      role: 'Encargado del tratamiento, solo si verificas un número de teléfono: envía los códigos por SMS',
      data: 'Tu número de teléfono y el código',
      location: SERVICES.smsProvider,
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
      data: 'Siempre tu nombre de usuario y tu avatar; con un perfil público (o, cuando existan los amigos, «Solo amigos», para tus amigos) también tu biografía, país, insignias, estadísticas, historial de partidas y fecha de alta',
      location: 'Dondequiera que se juegue a Bronze',
    },
  ],
}

const HEAD = ['Qué', 'Por qué', 'Base jurídica', 'Cuánto tiempo']
const dataRows = (items: DataItem[]) => items.map((d) => [d.what, d.why, d.basis, <Fill key="r" value={d.retention} />])

function PrivacyPolicy() {
  return (
    <LegalPage
      title="Política de privacidad"
      intro={
        <p>
          Bronze es un juego de estrategia al que puedes jugar en tu navegador. Como invitado puedes jugar sin darnos ningún dato sobre ti. Esta política explica
          qué tratamos cuando creas una cuenta, por qué, y cuáles son tus derechos.
        </p>
      }
    >
      <Section id="controller" title="Quiénes somos">
        <p>
          El responsable del tratamiento de tus datos personales es <Fill value={OPERATOR.name} /> (<Fill value={OPERATOR.legalForm} />),{' '}
          <Fill value={OPERATOR.address} />. Código de empresa <Fill value={OPERATOR.companyNumber} />. Para cualquier cuestión sobre tus datos, escribe a{' '}
          <Email value={OPERATOR.email} />. Consulta también los <TextLink to={PATHS.legal}>datos de la empresa</TextLink>.
        </p>
      </Section>

      <Section id="guests" title="Jugar como invitado">
        <p>
          Como invitado, no se nos envía nada sobre ti. Tus partidas se juegan en tu navegador, y lo que Bronze recuerda (tu partida en curso y, si lo permites,
          tus ajustes y estadísticas) se queda en el almacenamiento de tu navegador. La lista completa está en la{' '}
          <TextLink to={PATHS.cookies}>Política de cookies</TextLink>. Aun así, nuestro proveedor de alojamiento ve los datos técnicos que recibe cualquier sitio
          web:
        </p>
        <DataTable caption="Datos tratados para cada visitante" head={HEAD} rows={dataRows(inventory.visitor)} />
      </Section>

      <Section id="account" title="Con una cuenta">
        <p>
          La cuenta es opcional. Te permite conservar tus estadísticas y logros entre dispositivos, y será necesaria para jugar en línea cuando llegue. Solo
          recogemos lo que la cuenta necesita, y nunca te pedimos la fecha de nacimiento ni la ubicación. La biografía, el país, la imagen de avatar, el número
          de teléfono y la verificación de tarjeta son opcionales: solo los tenemos si los añades tú.
        </p>
        <DataTable caption="Datos tratados para los titulares de una cuenta" head={HEAD} rows={dataRows(inventory.account)} />
        <Sub title="Tu perfil y quién lo ve">
          <p>
            Tu perfil tiene su propia página. En Ajustes de la cuenta → Privacidad eliges quién ve tu perfil y, por separado, tu historial de partidas:{' '}
            <strong className={strong}>Público</strong> (cualquiera, también quien no ha iniciado sesión), <strong className={strong}>Solo amigos</strong>{' '}
            (mientras Bronze no tenga amigos, solo tú) o <strong className={strong}>Privado</strong> (solo tú). Tu nombre de usuario y tu avatar siempre son
            visibles, para que otros jugadores te reconozcan. Las cuentas de jugadores menores de 18 años empiezan en «Solo amigos». Tu correo, tu número de
            teléfono y los datos de tu tarjeta no se muestran nunca a nadie.
          </p>
        </Sub>
        <Sub title="Verificación de tarjeta y de teléfono">
          <p>
            Si verificas una tarjeta, la escribes en el formulario propio de Stripe, que la envía directamente a Stripe. Stripe comprueba la tarjeta sin cobrarle
            nada; nosotros solo recibimos que la comprobación ha salido bien, la marca de la tarjeta y sus 4 últimos dígitos. Stripe guarda su propio registro de
            la comprobación según{' '}
            <a href="https://stripe.com/privacy" className={link} rel="noopener">
              su política de privacidad
            </a>
            . Si verificas un número de teléfono, nuestro proveedor de SMS te envía el código. Puedes quitar la verificación de tarjeta cuando quieras en Ajustes
            de la cuenta → Seguridad.
          </p>
        </Sub>
        <p>
          Cuando eliminas tu cuenta, todo lo anterior se elimina de inmediato, incluida cualquier imagen que hayas subido. Pueden quedar copias en las copias de seguridad de la base de datos hasta{' '}
          <Fill value={SERVICES.backupRetention} />, hasta que se sobrescriban. Si empiezas a iniciar sesión con Google pero no terminas de crear la cuenta,
          elegir «Ahora no» la elimina al momento; si no, el registro sin terminar se elimina a los 7 días. Lo mismo ocurre con un registro por correo que nunca se
          confirma.
        </p>
        <p>
          No vendemos tus datos, no te mostramos anuncios, no te perfilamos ni tomamos decisiones automatizadas sobre ti. Bronze no tiene herramientas de
          analítica ni de seguimiento.
        </p>
      </Section>

      <Section id="emails" title="Correos electrónicos">
        <p>
          Enviamos los correos de cuenta que necesitas: confirmar tu dirección, restablecer tu contraseña y avisos de seguridad cuando cambian tu contraseña, tu
          correo, tu número de teléfono o tu verificación en dos pasos, o se verifica una tarjeta. No contienen nada más. Solo enviaríamos novedades u
          otros correos opcionales si los activas, y nunca a menores de 18 años. Bronze todavía no envía correos opcionales. Cada correo opcional tendrá un enlace
          para darse de baja con un clic, y puedes cambiar tus elecciones en cualquier momento en Ajustes → Notificaciones.
        </p>
      </Section>

      <Section id="recipients" title="Quién más trata tus datos">
        <DataTable
          caption="Destinatarios de los datos personales"
          head={['Quién', 'Función', 'Qué', 'Dónde']}
          rows={inventory.recipients.map((r) => [<Fill key="n" value={r.name} />, r.role, r.data, <Fill key="l" value={r.location} />])}
        />
        <Sub title="Transferencias fuera del EEE">
          <p>
            Supabase, Inc. tiene su sede en Estados Unidos. Los datos de tu cuenta se guardan en la región del proyecto indicada arriba; cuando se accede a ellos o
            se transfieren fuera del Espacio Económico Europeo, están protegidos por <Fill value={SERVICES.transferSafeguards} />. Stripe y nuestro proveedor
            de SMS también pueden tratar datos en Estados Unidos, protegidos por las garantías de sus propias condiciones de protección de datos (como el Marco de
            Privacidad de Datos UE-EE. UU. o las cláusulas contractuales tipo). Puedes pedirnos una copia de estas garantías.
          </p>
        </Sub>
      </Section>

      <Section id="rights" title="Tus derechos">
        <p>Según el RGPD, puedes:</p>
        <Bullets>
          <li>
            <strong className={strong}>acceder</strong> a tus datos y <strong className={strong}>llevártelos</strong> (portabilidad): Ajustes → Cuenta →
            Descargar mis datos te da una copia en un archivo;
          </li>
          <li>
            <strong className={strong}>rectificarlos</strong>: cámbialos en Ajustes de la cuenta o escríbenos;
          </li>
          <li>
            <strong className={strong}>suprimirlos</strong>: Ajustes → Cuenta → Eliminar mi cuenta;
          </li>
          <li>
            <strong className={strong}>oponerte</strong> al tratamiento basado en el interés legítimo, o pedirnos que lo <strong className={strong}>limitemos</strong>
            ;
          </li>
          <li>
            <strong className={strong}>retirar tu consentimiento</strong> en cualquier momento, sin que afecte a lo anterior: Ajustes de cookies (en el pie de
            página) y Ajustes → Notificaciones;
          </li>
          <li>
            <strong className={strong}>presentar una reclamación</strong> ante la autoridad lituana de protección de datos, la Inspección Estatal de Protección
            de Datos (<span lang="lt">Valstybinė duomenų apsaugos inspekcija, L. Sapiegos g. 17, LT-10312 Vilnius</span>, ada@ada.lt,{' '}
            <a href="https://vdai.lrv.lt" className={link} rel="noopener">
              vdai.lrv.lt
            </a>
            ), o ante la autoridad del lugar donde vives.
          </li>
        </Bullets>
        <p>
          Si no puedes iniciar sesión, usa la <TextLink to={PATHS.dataRequest}>página de solicitudes de datos</TextLink> o escribe a <Email value={OPERATOR.email} />
          . Respondemos en un plazo de 30 días (un mes). En solicitudes complejas podemos ampliarlo hasta dos meses más, y te diremos el motivo dentro del primer
          mes. Podemos pedirte que confirmes la solicitud desde el correo de tu cuenta, para que nadie más obtenga tus datos.
        </p>
      </Section>

      <Section id="children" title="Menores">
        <p>
          Las cuentas son solo para personas de {MIN_ACCOUNT_AGE} años o más ({MIN_ACCOUNT_AGE} años es la edad a partir de la cual en Lituania uno puede
          consentir por sí mismo los servicios en línea según el artículo 8 del RGPD). Los jugadores más jóvenes pueden jugar como invitados, lo que no guarda nada
          sobre ellos en nuestros sistemas. Al registrarte te preguntamos si tienes 14–17 o 18 o más años; no te pedimos la fecha de nacimiento. Nunca enviamos
          marketing a menores de 18 años, y cualquier menor de 18 necesita el permiso de su madre, padre o tutor para cualquier compra (hoy Bronze no vende nada).
          Si sabemos que una cuenta pertenece a alguien menor de {MIN_ACCOUNT_AGE} años, la eliminamos.
        </p>
      </Section>

      <Section id="security" title="Seguridad">
        <p>
          Las conexiones están cifradas (HTTPS). Las contraseñas y los códigos de recuperación solo se guardan como hashes. Cada jugador solo puede leer y
          cambiar sus propios datos privados; tras 5 contraseñas incorrectas, los inicios de sesión de ese nombre de usuario se pausan 30 segundos, y las
          contraseñas, los códigos y las denuncias solo se pueden probar unas pocas veces por hora. En Ajustes de la cuenta → Seguridad puedes activar la
          verificación en dos pasos, ver tus inicios de sesión recientes y cerrar la sesión en tus otros dispositivos.
        </p>
      </Section>

      <Section id="changes" title="Cambios en esta política">
        <p>
          Cuando cambiamos esta política, actualizamos la fecha de arriba. Te avisaremos de los cambios importantes antes de que entren en vigor, en el juego o por
          correo.
        </p>
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
          Estas condiciones son el acuerdo entre tú y <Fill value={OPERATOR.name} /> («nosotros») sobre el uso de Bronze. Al crear una cuenta, las aceptas. Si
          juegas como invitado, solo se aplican las partes sobre el juego limpio y sobre que el juego se ofrece tal cual.
        </p>
      }
    >
      <Section id="eligibility" title="Quién puede jugar">
        <p>
          Cualquiera puede jugar como invitado. Para crear una cuenta debes tener al menos {MIN_ACCOUNT_AGE} años. Si tienes menos de 18, tu madre, padre o tutor
          debe estar de acuerdo antes de que compres nada (hoy Bronze no vende nada).
        </p>
      </Section>

      <Section id="accounts" title="Tu cuenta">
        <Bullets>
          <li>Una cuenta por persona. Usa una dirección de correo real a la que tengas acceso y no compartas tu contraseña con nadie.</li>
          <li>Eres responsable de lo que ocurra en tu cuenta, salvo que alguien haya entrado sin culpa tuya.</li>
          <li>Puedes eliminar tu cuenta en cualquier momento: Ajustes → Cuenta.</li>
        </Bullets>
      </Section>

      <Section id="usernames" title="Nombres de usuario">
        <p>
          Los nombres de usuario tienen de 3 a 20 letras, números y guiones bajos, y los ven los demás jugadores. No elijas uno que suplante a otra persona, que
          insulte o acose, que incite al odio, que sea sexual o que anuncie algo. Podemos pedirte que cambies un nombre que incumpla estas reglas, o cambiarlo
          nosotros si no lo haces.
        </p>
      </Section>

      <Section id="fair-play" title="Juego limpio">
        <p>Juega como el juego está pensado. No se permite:</p>
        <Bullets>
          <li>hacer trampas, usar bots o scripts que jueguen por ti, o aprovechar errores (mejor, avísanos);</li>
          <li>interferir con el servicio, las cuentas de otros jugadores o los servidores;</li>
          <li>acosar, amenazar o insultar a otros jugadores, ni compartir nada ilegal.</li>
        </Bullets>
      </Section>

      <Section id="virtual-items" title="Objetos y moneda virtuales">
        <p>
          Hoy Bronze no tiene objetos virtuales ni moneda del juego. Si los tuviera más adelante: son una licencia para usarlos en Bronze, no una propiedad; no
          tienen valor real y no se pueden canjear por dinero, vender ni transferir a otra cuenta. Esto no afecta a tus derechos como consumidor sobre lo que hayas
          pagado (consulta la <TextLink to={PATHS.refunds}>Política de reembolsos</TextLink>).
        </p>
      </Section>

      <Section id="content" title="El juego y su contenido">
        <p>
          Bronze, sus ilustraciones, mapas y código pertenecen a <Fill value={OPERATOR.name} /> o a sus licenciantes (consulta los{' '}
          <TextLink to={PATHS.credits}>Créditos</TextLink>). Puedes jugarlo para tu uso personal y no comercial.
        </p>
      </Section>

      <Section id="termination" title="Suspensión y cierre de cuentas">
        <p>
          Si incumples estas condiciones de forma grave o reiterada, podemos suspender o cerrar tu cuenta. Salvo que resulte inseguro o ilegal, primero te diremos
          el motivo y te daremos la oportunidad de responder. Puedes cerrar tu cuenta en cualquier momento.
        </p>
      </Section>

      <Section id="disclaimers" title="Disponibilidad">
        <p>
          Bronze es una versión temprana. Hacemos lo posible para que funcione y tus datos estén seguros, pero las funciones pueden cambiar y el servicio puede no
          estar disponible o tener errores. El progreso como invitado solo está en tu navegador: si borras los datos del navegador, se pierde.
        </p>
      </Section>

      <Section id="liability" title="Responsabilidad">
        <p>
          Bronze es gratuito. No somos responsables de pérdidas indirectas ni de pérdidas que hubieras podido evitar. Nada en estas condiciones limita la
          responsabilidad por muerte o lesiones causadas por negligencia, por fraude, por daños causados con dolo o negligencia grave, ni ninguna otra
          responsabilidad que la ley no permita limitar. Tus derechos legales como consumidor no se ven afectados.
        </p>
      </Section>

      <Section id="law" title="Ley aplicable y conflictos">
        <p>
          Estas condiciones se rigen por la ley de Lituania. Si eres un consumidor que vive en la UE, conservas además la protección de las normas imperativas de
          consumo de tu país de residencia y puedes acudir a sus tribunales.
        </p>
        <p>
          Primero, contáctanos en <Email value={OPERATOR.email} />. Los consumidores también pueden acudir al Servicio Estatal lituano de Protección de los
          Derechos de los Consumidores (<span lang="lt">Valstybinė vartotojų teisių apsaugos tarnyba</span>,{' '}
          <a href="https://vvtat.lrv.lt" className={link} rel="noopener">
            vvtat.lrv.lt
          </a>
          ), que resuelve conflictos de consumo fuera de los tribunales.
        </p>
      </Section>

      <Section id="changes" title="Cambios en estas condiciones">
        <p>
          Podemos actualizar estas condiciones, por ejemplo cuando lleguen nuevas funciones. Te avisaremos de los cambios importantes antes de que entren en vigor,
          en el juego o por correo. Si no estás de acuerdo, puedes eliminar tu cuenta; si no, las nuevas condiciones se aplican desde su fecha.
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
  const title = (id: string) => inventory.categories.find((c) => c.id === id)!.title
  return (
    <LegalPage
      title="Política de cookies"
      intro={
        <p>
          Bronze usa una cookie y algunas entradas en el almacenamiento local y de sesión de tu navegador. Son de Bronze: no se comparte nada con otros sitios y
          no hay rastreadores de publicidad, analítica ni redes sociales. La única excepción es la verificación de tarjeta, que inicias tú: entonces el formulario
          de tarjeta de Stripe pone sus propias cookies contra el fraude.
        </p>
      }
    >
      <Section id="categories" title="Categorías">
        <Bullets>
          {inventory.categories.map((c) => (
            <li key={c.id}>
              <strong className={strong}>{c.title}.</strong> {c.description}
            </li>
          ))}
        </Bullets>
        <p>
          El almacenamiento esencial es necesario para lo que pides a Bronze, así que no requiere tu consentimiento. Todo lo demás espera tu consentimiento:
          hasta que permitas las Preferencias, tus ajustes solo duran hasta que cierres la página.
        </p>
        <p>
          Las cookies de Stripe solo se ponen si pulsas <strong className={strong}>Verificar con una tarjeta</strong> en Ajustes de la cuenta → Seguridad, al
          cargarse el formulario de Stripe. Son necesarias para comprobar la tarjeta de forma segura, así que cuentan como esenciales. El formulario de Stripe
          también puede guardar cookies en los propios sitios de Stripe; consulta{' '}
          <a href="https://stripe.com/legal/cookies-policy" className={link} rel="noopener">
            la política de cookies de Stripe
          </a>
          .
        </p>
      </Section>

      <Section id="list" title="Todo lo que guarda Bronze">
        <DataTable
          caption="Cookies y almacenamiento que usa Bronze"
          head={['Nombre', 'Tipo', 'Proveedor', 'Finalidad', 'Categoría', 'Duración']}
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

      <Section id="choices" title="Tus elecciones">
        <p>
          Puedes cambiar tus elecciones en cualquier momento en los{' '}
          <button type="button" onClick={() => consentStore.reopen()} className={link}>
            Ajustes de cookies
          </button>{' '}
          (también en el pie de cada página). Desactivar una categoría borra lo que guardó. También puedes borrar todo lo que Bronze guardó en Ajustes → Cuenta, o
          desde tu navegador. Volvemos a preguntar a los 12 meses, o antes si esta política cambia.
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
