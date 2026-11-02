import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useI18n } from '../../i18n';

interface Props {
  tone?: 'light' | 'dark';
}

export default function LanguageSwitch({ tone = 'dark' }: Props) {
  const { language, setLanguage } = useI18n();
  const isDark = tone === 'dark';

  return (
    <View style={[styles.wrap, isDark ? styles.wrapDark : styles.wrapLight]}>
      {(['fr', 'en'] as const).map((value) => {
        const active = language === value;
        return (
          <TouchableOpacity
            key={value}
            onPress={() => setLanguage(value)}
            activeOpacity={0.8}
            style={[
              styles.option,
              active && (isDark ? styles.optionActiveDark : styles.optionActiveLight),
            ]}
          >
            <Text
              style={[
                styles.label,
                isDark ? styles.labelDark : styles.labelLight,
                active && (isDark ? styles.labelActiveDark : styles.labelActiveLight),
              ]}
            >
              {value.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    padding: 2,
  },
  wrapDark: { borderColor: 'rgba(255,255,255,0.25)', backgroundColor: 'rgba(255,255,255,0.10)' },
  wrapLight: { borderColor: '#E1E8F2', backgroundColor: '#F5F8FC' },
  option: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  optionActiveDark: { backgroundColor: '#FFFFFF' },
  optionActiveLight: { backgroundColor: '#0057FF' },
  label: { fontSize: 10, fontWeight: '700' },
  labelDark: { color: 'rgba(255,255,255,0.72)' },
  labelLight: { color: '#5A6980' },
  labelActiveDark: { color: '#002D72' },
  labelActiveLight: { color: '#FFFFFF' },
});
