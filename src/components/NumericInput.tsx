import React from 'react';
import { View, StyleSheet } from 'react-native';
import { IconButton, TextInput, useTheme } from 'react-native-paper';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
  disabled?: boolean;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 9999,
  label,
  disabled = false,
}) => {
  const theme = useTheme();

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  return (
    <View style={styles.container}>
      <IconButton
        icon="minus"
        mode="contained"
        containerColor={theme.colors.secondaryContainer}
        iconColor={theme.colors.onSecondaryContainer}
        size={32}
        onPress={handleDecrement}
        disabled={disabled || value <= min}
      />
      <TextInput
        mode="outlined"
        value={value.toString()}
        label={label}
        keyboardType="numeric"
        onChangeText={(text) => {
          const num = parseInt(text, 10);
          if (!isNaN(num) && num >= min && num <= max) {
            onChange(num);
          } else if (text === '') {
            onChange(min);
          }
        }}
        disabled={disabled}
        style={styles.input}
      />
      <IconButton
        icon="plus"
        mode="contained"
        containerColor={theme.colors.primary}
        iconColor={theme.colors.onPrimary}
        size={32}
        onPress={handleIncrement}
        disabled={disabled || value >= max}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  input: {
    width: 80,
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
