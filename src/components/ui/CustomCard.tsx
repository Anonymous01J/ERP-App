import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Card, useTheme } from 'react-native-paper';

interface CustomCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

export const CustomCard: React.FC<CustomCardProps> = ({ children, style, onPress }) => {
  const theme = useTheme();

  return (
    <Card 
      style={[styles.card, { backgroundColor: theme.colors.surface }, style]} 
      elevation={2} 
      onPress={onPress}
      mode="elevated"
    >
      {children}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 16,
    borderRadius: 16,
  },
});
