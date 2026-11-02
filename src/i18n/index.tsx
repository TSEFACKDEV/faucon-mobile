import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'fr' | 'en';

const STORAGE_KEY = 'faucon_language';

const messages: Record<Language, Record<string, string>> = {
  fr: {
    'tabs.map': 'Carte',
    'tabs.devices': 'Dispositifs',
    'tabs.alerts': 'Alertes',
    'tabs.profile': 'Profil',

    'profile.title': 'Profil',
    'profile.application': 'APPLICATION',
    'profile.devices': 'Mes dispositifs',
    'profile.apiKeys': 'Clés API',
    'profile.integrations': 'Intégrations',
    'profile.language': 'Langue',
    'profile.french': 'Français',
    'profile.english': 'English',
    'profile.support': 'ASSISTANCE',
    'profile.privacy': 'Politique de confidentialité',
    'profile.help': 'Aide et support',
    'profile.session': 'SESSION',
    'profile.logout': 'Se déconnecter',
    'profile.logoutTitle': 'Se déconnecter',
    'profile.logoutMessage': 'Êtes-vous sûr de vouloir vous déconnecter ?',
    'profile.cancel': 'Annuler',
    'profile.disconnect': 'Déconnecter',
    'profile.logoutError': 'Impossible de vous déconnecter pour le moment.',
    'profile.version': 'FAUCON v1.0.0 · Voir · Surveiller · Contrôler',
    'profile.privacyText': "FAUCON collecte uniquement les données de localisation de vos dispositifs et de votre compte pour assurer le suivi de vos équipements. Aucune donnée n'est partagée avec des tiers.",
    'profile.helpText': "Besoin d'aide ? Contactez notre équipe à support@faucon.app.",
    'profile.chooseLanguage': 'Choisir la langue',

    'alerts.title': 'Alertes',
    'alerts.all': 'Toutes',
    'alerts.zone': 'Zone',
    'alerts.speed': 'Vitesse',
    'alerts.detach': 'Décolle.',
    'alerts.battery': 'Batterie',
    'alerts.inactive': 'Inactif',
    'alerts.acknowledge': 'Acquitter',
    'alerts.acknowledgeAll': 'Tout acquitter',
    'alerts.delete': 'Supprimer',
    'alerts.deleteTitle': 'Supprimer cette alerte',
    'alerts.deleteMessage': 'Cette alerte sera définitivement supprimée.',
    'alerts.cancel': 'Annuler',
    'alerts.deleteConfirm': 'Supprimer',
    'alerts.emptyTitle': 'Aucune alerte',
    'alerts.emptySubtitle': 'Tous vos équipements sont dans les limites définies.',
    'alerts.loadError': 'Impossible de récupérer les alertes.',
    'alerts.ackError': "Impossible d'acquitter cette alerte.",
    'alerts.deleteError': 'Impossible de supprimer cette alerte.',
    'alerts.acquitted': 'Alerte acquittée et supprimée.',
    'alerts.allAcquitted': 'Toutes les alertes ont été acquittées.',
    'alerts.retry': 'Réessayer',

    'login.title': 'Connexion',
    'login.subtitle': 'Accédez à votre tableau de bord',
    'login.email': 'ADRESSE EMAIL',
    'login.password': 'MOT DE PASSE',
    'login.emailPlaceholder': 'john@email.com',
    'login.passwordPlaceholder': 'Votre mot de passe',
    'login.submit': 'Se connecter',
    'login.noAccount': 'Pas encore de compte ?',
    'login.signup': "S'inscrire",
    'login.error': 'Email ou mot de passe incorrect.',
  },
  en: {
    'tabs.map': 'Map',
    'tabs.devices': 'Devices',
    'tabs.alerts': 'Alerts',
    'tabs.profile': 'Profile',

    'profile.title': 'Profile',
    'profile.application': 'APPLICATION',
    'profile.devices': 'My devices',
    'profile.apiKeys': 'API keys',
    'profile.integrations': 'Integrations',
    'profile.language': 'Language',
    'profile.french': 'Français',
    'profile.english': 'English',
    'profile.support': 'SUPPORT',
    'profile.privacy': 'Privacy policy',
    'profile.help': 'Help & support',
    'profile.session': 'SESSION',
    'profile.logout': 'Sign out',
    'profile.logoutTitle': 'Sign out',
    'profile.logoutMessage': 'Are you sure you want to sign out?',
    'profile.cancel': 'Cancel',
    'profile.disconnect': 'Sign out',
    'profile.logoutError': 'Unable to sign out right now.',
    'profile.version': 'FAUCON v1.0.0 · See · Monitor · Control',
    'profile.privacyText': 'FAUCON only collects the location data of your devices and your account to monitor your equipment. No data is shared with third parties.',
    'profile.helpText': 'Need help? Contact our team at support@faucon.app.',
    'profile.chooseLanguage': 'Choose language',

    'alerts.title': 'Alerts',
    'alerts.all': 'All',
    'alerts.zone': 'Zone',
    'alerts.speed': 'Speed',
    'alerts.detach': 'Detach.',
    'alerts.battery': 'Battery',
    'alerts.inactive': 'Inactive',
    'alerts.acknowledge': 'Acknowledge',
    'alerts.acknowledgeAll': 'Acknowledge all',
    'alerts.delete': 'Delete',
    'alerts.deleteTitle': 'Delete this alert',
    'alerts.deleteMessage': 'This alert will be permanently deleted.',
    'alerts.cancel': 'Cancel',
    'alerts.deleteConfirm': 'Delete',
    'alerts.emptyTitle': 'No alerts',
    'alerts.emptySubtitle': 'Everything is quiet for now.',
    'alerts.loadError': 'Unable to load alerts.',
    'alerts.ackError': 'Unable to acknowledge this alert.',
    'alerts.deleteError': 'Unable to delete this alert.',
    'alerts.acquitted': 'Alert acknowledged and deleted.',
    'alerts.allAcquitted': 'All alerts have been acknowledged.',
    'alerts.retry': 'Retry',

    'login.title': 'Sign in',
    'login.subtitle': 'Access your dashboard',
    'login.email': 'EMAIL ADDRESS',
    'login.password': 'PASSWORD',
    'login.emailPlaceholder': 'john@email.com',
    'login.passwordPlaceholder': 'Your password',
    'login.submit': 'Sign in',
    'login.noAccount': 'No account yet?',
    'login.signup': 'Sign up',
    'login.error': 'Incorrect email or password.',
  },
};

interface I18nValue {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fr');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'fr') setLanguageState(saved);
      })
      .catch(() => undefined);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setLanguageState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined);
  }, []);

  const t = useCallback(
    (key: string) => messages[language][key] ?? messages.fr[key] ?? key,
    [language]
  );

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
