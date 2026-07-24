import { Text, TextProps } from 'react-native';
import { Typography as TypographyScale, TypographyVariant } from '../../constants/typography';
import { Colors } from '../../constants/colors';

interface Props extends TextProps {
  variant?: TypographyVariant;
  color?: string;
}

export default function AppText({
  variant = 'body',
  color = Colors.textPrimary,
  style,
  children,
  ...rest
}: Props) {
  return (
    <Text style={[TypographyScale[variant], { color }, style]} {...rest}>
      {children}
    </Text>
  );
}
