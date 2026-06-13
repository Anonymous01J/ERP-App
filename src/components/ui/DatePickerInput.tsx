import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native';
import { TextInput, Modal, Portal, useTheme } from 'react-native-paper';
import { CalendarCustom } from './CalendarCustom';

export interface DatePickerInputProps {
  /**
   * Texto de la etiqueta del input
   */
  label: string;
  /**
   * Valor actual de la fecha en formato YYYY-MM-DD
   */
  value: string;
  /**
   * Callback que se ejecuta cuando el usuario selecciona una fecha en el calendario
   */
  onChange: (date: string) => void;
  /**
   * Indica si el input debe mostrar estado de error
   */
  error?: boolean;
  /**
   * Estilos opcionales para el contenedor
   */
  style?: StyleProp<ViewStyle>;
}

/**
 * Componente que simula un input de tipo fecha.
 * Al tocarlo, abre un Modal con el CalendarCustom para seleccionar la fecha.
 */
export const DatePickerInput: React.FC<DatePickerInputProps> = ({
  label,
  value,
  onChange,
  error,
  style,
}) => {
  const [visible, setVisible] = useState(false);
  const theme = useTheme();

  const showModal = () => setVisible(true);
  const hideModal = () => setVisible(false);

  const handleDayPress = (day: { dateString: string }) => {
    onChange(day.dateString);
    hideModal();
  };

  // Formatear la fecha visualmente a DD/MM/YYYY si existe un valor
  // Asume que la entrada value es YYYY-MM-DD
  const displayValue = value ? value.split('-').reverse().join('/') : '';

  return (
    <View style={style}>
      {/* 
        Usamos TouchableOpacity envolviendo el TextInput. 
        pointerEvents="none" evita que el input intercepte el toque y abra el teclado (que igual está deshabilitado por editable={false}).
      */}
      <TouchableOpacity onPress={showModal} activeOpacity={0.8}>
        <View pointerEvents="none">
          <TextInput
            label={label}
            value={displayValue}
            mode="outlined"
            editable={false}
            error={error}
            right={<TextInput.Icon icon="calendar" />}
            style={styles.input}
          />
        </View>
      </TouchableOpacity>

      {/* Portal renderiza el modal encima de todo el árbol de vistas */}
      <Portal>
        <Modal
          visible={visible}
          onDismiss={hideModal}
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.surface }
          ]}
        >
          <CalendarCustom
            current={value || undefined}
            onDayPress={handleDayPress}
            markedDates={
              value
                ? { [value]: { selected: true, selectedColor: theme.colors.primary } }
                : {}
            }
          />
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: 'transparent',
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    padding: 10,
  },
});
