import { Ionicons } from '@expo/vector-icons';

export interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: 'navigate-circle-outline',
    title: 'Suivez vos dispositifs en temps réel',
    subtitle: 'Visualisez la position, la vitesse et la batterie de chaque traceur FAUCON sur la carte, en direct.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Restez alerté en toute circonstance',
    subtitle: 'Limite de vitesse, périmètre de sécurité, décollement du traceur : recevez une alerte immédiate en cas d\'anomalie.',
  },
  {
    icon: 'time-outline',
    title: 'Consultez l\'historique de chaque trajet',
    subtitle: 'Rejouez les déplacements passés et retrouvez la distance parcourue jour après jour.',
  },
  {
    icon: 'link-outline',
    title: 'Connectez votre traceur en un instant',
    subtitle: 'Entrez l\'identifiant et le code d\'activation fournis avec votre boîtier pour commencer.',
  },
];
