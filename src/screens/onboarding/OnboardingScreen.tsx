import { useRef, useState } from 'react';
import { View, StyleSheet, useWindowDimensions, TouchableOpacity, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
  SharedValue,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import { Spacing } from '../../constants/spacing';
import { ONBOARDING_SLIDES, OnboardingSlide } from '../../constants/onboarding';
import { useOnboardingStore } from '../../store/onboardingStore';
import AppText from '../../components/ui/Typography';
import Button from '../../components/ui/Button';
import Logo from '../../components/ui/Logo';

interface SlideProps {
  item: OnboardingSlide;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
}

function Slide({ item, index, scrollX, width }: SlideProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP);
    const translateY = interpolate(scrollX.value, inputRange, [24, 0, 24], Extrapolation.CLAMP);
    const scale = interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP);
    return { opacity, transform: [{ translateY }, { scale }] };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.iconWrap, animatedStyle]}>
        <Ionicons name={item.icon} size={56} color={Colors.primary} />
      </Animated.View>
      <Animated.View style={animatedStyle}>
        <AppText variant="h1" style={styles.title}>{item.title}</AppText>
        <AppText variant="body" color={Colors.textSecondary} style={styles.subtitle}>
          {item.subtitle}
        </AppText>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const dotWidth = interpolate(scrollX.value, inputRange, [8, 24, 8], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP);
    return { width: dotWidth, opacity };
  });

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

export default function OnboardingScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const markSeen = useOnboardingStore((s) => s.markSeen);

  const listRef = useRef<Animated.FlatList<OnboardingSlide> | null>(null);
  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setActiveIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const isLast = activeIndex === ONBOARDING_SLIDES.length - 1;

  const goNext = () => {
    if (isLast) {
      markSeen();
      return;
    }
    listRef.current?.scrollToOffset({ offset: (activeIndex + 1) * width, animated: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Logo tone="color" size={22} showWordmark={false} />
        {!isLast && (
          <TouchableOpacity onPress={markSeen} hitSlop={8}>
            <AppText variant="bodyBold" color={Colors.textMuted}>Passer</AppText>
          </TouchableOpacity>
        )}
      </View>

      <Animated.FlatList
        ref={listRef}
        data={ONBOARDING_SLIDES}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index }) => (
          <Slide item={item} index={index} scrollX={scrollX} width={width} />
        )}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <Dot key={i} index={i} scrollX={scrollX} width={width} />
          ))}
        </View>

        <Button label={isLast ? 'Commencer' : 'Suivant'} onPress={goNext} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    height: 44,
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  iconWrap: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  title: { textAlign: 'center', marginBottom: Spacing.sm },
  subtitle: { textAlign: 'center', lineHeight: 22 },
  footer: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, gap: Spacing.xl },
  dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4, backgroundColor: Colors.primary },
});
