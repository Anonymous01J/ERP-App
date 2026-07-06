import { StyleSheet } from 'react-native';

export const globalStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA', // Default background
  },
  containerWhite: {
    flex: 1,
    backgroundColor: '#ffffff', // For screens like RegistrarClienteScreen
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  footer: {
    padding: 24,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  saveButton: {
    borderRadius: 12,
    marginBottom: 16,
  },
  saveButtonContent: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#1f2937',
  },
});
