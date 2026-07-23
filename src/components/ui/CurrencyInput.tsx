import React from 'react';
import { TextInput } from 'react-native-paper';
import { formatCurrencyATM } from '@core/utils/currency';

interface CurrencyInputProps extends React.ComponentProps<typeof TextInput> {
  value: string;
  onChangeText: (text: string) => void;
}

export function CurrencyInput(props: CurrencyInputProps) {
  const { value, onChangeText, ...rest } = props;

  const handleChange = (text: string) => {
    if (!text) {
      onChangeText('');
      return;
    }
    const formatted = formatCurrencyATM(text);
    onChangeText(formatted);
  };

  // Formateo instantáneo sin hook useEffect ni estado duplicado (0 re-renders innecesarios)
  const displayValue = formatCurrencyATM(value);

  return (
    <TextInput
      {...rest}
      value={displayValue}
      onChangeText={handleChange}
      keyboardType="numeric"
    />
  );
}
