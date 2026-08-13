// Formate les erreurs en messages clairs pour l'utilisateur (app mobile).
// Le serveur renvoie `{ success: false, message }` ; on privilégie ce message
// métier (déjà en français), sinon on retombe sur un message générique selon
// le type d'erreur (réseau, HTTP, délai d'attente). Évite aussi de faire
// transparaître des messages techniques bruts (Prisma, pile d'appel…).

interface ApiErrorShape {
  code?: string;
  message?: string;
  response?: {
    status?: number;
    data?: { message?: string };
  };
}

// Un message « technique » n'a rien à faire à l'écran.
const TECHNIQUE_PATTERN =
  /PrismaClient|TypeError|ReferenceError|RangeError|SyntaxError|ValidationError|\b at \b|at [A-Za-z]|Error:|ERR_|ECONN|ETIMEDOUT|QueryFailed|SQLSTATE|AxiosError/i;

const generiqueParStatut = (status: number | undefined): string | null => {
  switch (status) {
    case 403:
      return 'Accès refusé : vous n’avez pas la permission d’effectuer cette action.';
    case 404:
      return 'Élément introuvable ou supprimé. Actualisez la liste, puis réessayez.';
    case 429:
      return 'Trop de tentatives. Patientez un moment, puis réessayez.';
    default:
      return status !== undefined && status >= 500
        ? 'Erreur interne du serveur. Réessayez dans un instant.'
        : null;
  }
};

export function getErrorMessage(err: unknown, fallback: string): string {
  const e = (err ?? {}) as ApiErrorShape;

  // Serveur injoignable ou délai dépassé.
  if (e.code === 'ECONNABORTED' || e.code === 'ERR_CANCELED') {
    return 'Le serveur met trop de temps à répondre. Réessayez dans un instant.';
  }
  if (e.code === 'ERR_NETWORK' || (!e.response && !e.code)) {
    return 'Impossible de joindre le serveur. Vérifiez votre connexion Internet, puis réessayez.';
  }

  // Message métier explicite renvoyé par le serveur.
  const server = e.response?.data?.message;
  if (typeof server === 'string' && server.trim() && !TECHNIQUE_PATTERN.test(server)) {
    return server;
  }

  return generiqueParStatut(e.response?.status) ?? fallback;
}
