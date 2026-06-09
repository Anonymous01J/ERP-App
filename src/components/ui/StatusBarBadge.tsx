import React from 'react';
import { Chip, useTheme } from 'react-native-paper';

export type StatusType = 'pendiente' | 'en_produccion' | 'listo' | 'entregado' | 'credito' | 'por_vencer' | 'atrasado';

interface StatusBarBadgeProps {
  status: StatusType;
}

export const StatusBarBadge: React.FC<StatusBarBadgeProps> = ({ status }) => {
  const theme = useTheme();

  let color = theme.colors.surface;
  let textColor = theme.colors.onSurface;
  let label = '';
  let icon = '';

  switch (status) {
    case 'pendiente':
      color = theme.colors.errorContainer;
      textColor = theme.colors.onErrorContainer;
      label = 'Pendiente';
      icon = 'alert-circle-outline';
      break;
    case 'en_produccion':
      color = theme.colors.secondaryContainer;
      textColor = theme.colors.onSecondaryContainer;
      label = 'En Producción';
      icon = 'progress-clock';
      break;
    case 'listo':
      color = theme.colors.primaryContainer;
      textColor = theme.colors.onPrimaryContainer;
      label = 'Listo';
      icon = 'check-circle-outline';
      break;
    case 'entregado':
      color = '#C8E6C9'; // Success custom color based on M3 green
      textColor = '#1B5E20';
      label = 'Entregado';
      icon = 'truck-check-outline';
      break;
    case 'credito':
      color = '#E3F2FD'; // M3 Light Blue for standard credit
      textColor = '#1565C0';
      label = 'Crédito al Día';
      icon = 'cash-check';
      break;
    case 'por_vencer':
      color = '#FFECB3'; // M3 amber for warning
      textColor = '#FF8F00';
      label = 'Por Vencer';
      icon = 'cash-clock';
      break;
    case 'atrasado':
      color = '#FFCDD2'; // M3 red for overdue
      textColor = '#C62828';
      label = 'Atrasado';
      icon = 'cash-remove';
      break;
  }

  return (
    <Chip
      icon={icon}
      textStyle={{ color: textColor, fontWeight: 'bold' }}
      style={{ backgroundColor: color, marginVertical: 4 }}
      compact
    >
      {label}
    </Chip>
  );
};
