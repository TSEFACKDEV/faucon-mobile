import { Ionicons } from '@expo/vector-icons';

export interface OnboardingSlide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  titleEn: string;
  subtitle: string;
  subtitleEn: string;
}

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    icon: 'navigate-circle-outline',
    title: 'Suivez vos dispositifs en temps réel',
    titleEn: 'Track your devices in real time',
    subtitle: 'Visualisez la position, la vitesse et la batterie de chaque traceur FAUCON sur la carte, en direct.',
    subtitleEn: 'See the position, speed and battery of every FAUCON tracker on the map, live.',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Restez alerté en toute circonstance',
    titleEn: 'Stay alerted in every situation',
    subtitle: 'Limite de vitesse, périmètre de sécurité, décollement du traceur : recevez une alerte immédiate en cas d\'anomalie.',
    subtitleEn: 'Speed limit, safety perimeter, tracker removal: get an immediate alert when something goes wrong.',
  },
  {
    icon: 'time-outline',
    title: 'Consultez l\'historique de chaque trajet',
    titleEn: 'Review every trip',
    subtitle: 'Rejouez les déplacements passés et retrouvez la distance parcourue jour après jour.',
    subtitleEn: 'Replay past movements and see the distance travelled day by day.',
  },
  {
    icon: 'link-outline',
    title: 'Connectez votre traceur en un instant',
    titleEn: 'Connect your tracker in seconds',
    subtitle: 'Entrez l\'identifiant et le code d\'activation fournis avec votre boîtier pour commencer.',
    subtitleEn: 'Enter the identifier and activation code provided with your device to get started.',
  },
];
