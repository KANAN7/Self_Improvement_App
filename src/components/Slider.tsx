import RNSlider from '@react-native-community/slider';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { colors, spacing } from '@/theme';

type SliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
};

export function Slider({
  label,
  value,
  onChange,
  min = 1,
  max = 5,
  step = 1,
}: SliderProps) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        <Text variant="caption" color="textSecondary">
          {value}
        </Text>
      </View>
      <RNSlider
        value={value}
        onValueChange={onChange}
        minimumValue={min}
        maximumValue={max}
        step={step}
        minimumTrackTintColor={colors.accentGold}
        maximumTrackTintColor={colors.textSecondary}
        thumbTintColor={colors.accentGold}
      />
    </View>
  );
}
