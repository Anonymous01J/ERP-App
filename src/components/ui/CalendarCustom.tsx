import React from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { Calendar, CalendarProps } from 'react-native-calendars';
import { useTheme, Surface } from 'react-native-paper';

export interface CalendarCustomProps extends CalendarProps {
  /**
   * Estilo opcional para el contenedor del calendario.
   */
  containerStyle?: ViewStyle;
}

/**
 * Componente de calendario personalizado que se integra con el tema de React Native Paper.
 * Envoltura sobre `react-native-calendars`.
 */
export const CalendarCustom: React.FC<CalendarCustomProps> = ({ 
  containerStyle, 
  theme: customTheme,
  ...rest 
}) => {
  const theme = useTheme();

  return (
    <Surface style={[styles.container, { backgroundColor: theme.colors.surface }, containerStyle]} elevation={1}>
      <Calendar
        // Propiedades de tema predeterminadas basadas en el tema actual de Paper
        theme={{
          backgroundColor: theme.colors.surface,
          calendarBackground: theme.colors.surface,
          textSectionTitleColor: theme.colors.onSurfaceVariant,
          selectedDayBackgroundColor: theme.colors.primary,
          selectedDayTextColor: theme.colors.onPrimary,
          todayTextColor: theme.colors.primary,
          dayTextColor: theme.colors.onSurface,
          textDisabledColor: theme.colors.surfaceDisabled || '#e0e0e0', // fallback if surfaceDisabled is missing
          dotColor: theme.colors.primary,
          selectedDotColor: theme.colors.onPrimary,
          arrowColor: theme.colors.primary,
          monthTextColor: theme.colors.onSurface,
          indicatorColor: theme.colors.primary,
          
          // Tipografías alineadas a React Native Paper
          textDayFontFamily: theme.fonts.bodyMedium.fontFamily,
          textMonthFontFamily: theme.fonts.titleMedium.fontFamily,
          textDayHeaderFontFamily: theme.fonts.labelMedium.fontFamily,
          
          // Permitir sobreescribir cualquier prop del tema
          ...customTheme,
        }}
        {...rest}
      />
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    paddingBottom: 8,
    marginVertical: 8,
  },
});
