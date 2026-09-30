import { useColorScheme } from 'react-native';

// Palettes clair / sombre : l'app suit le réglage du téléphone
const light = {
  surface: '#FFFFFF',          // boutons flottants, barre de recherche, modales
  surfaceActive: '#E8F2FF',    // bouton du speed dial ouvert
  surfacePressed: '#F5F7FA',
  surfaceMuted: '#EEEEEE',     // boutons 1-5 non sélectionnés
  text: '#1F2937',
  textSecondary: '#555555',
  textMuted: '#6B7280',
  placeholder: '#9CA3AF',
  border: '#E5E7EB',
  primary: '#007AFF',
  onPrimary: '#FFFFFF',
  danger: '#FF3B30',
  sliderTrack: '#DDDDDD',
  crowdAccent: '#45A9A7',
  noiseAccent: '#203840',
  backdrop: 'rgba(0,0,0,0.18)',
  modalOverlay: 'rgba(0,0,0,0.5)',
  toastBackground: 'rgba(32,56,64,0.92)',
  toastText: '#FFFFFF',
  spinner: '#007AFF',
};

export type Palette = typeof light;

const dark: Palette = {
  surface: '#1C1C1E',
  surfaceActive: '#1E3A5F',
  surfacePressed: '#2C2C2E',
  surfaceMuted: '#2C2C2E',
  text: '#F3F4F6',
  textSecondary: '#D1D5DB',
  textMuted: '#9CA3AF',
  placeholder: '#8E8E93',
  border: '#38383A',
  primary: '#0A84FF',
  onPrimary: '#FFFFFF',
  danger: '#FF453A',
  sliderTrack: '#48484A',
  crowdAccent: '#45A9A7',
  noiseAccent: '#8DB8C4',      // #203840 serait invisible sur fond sombre
  backdrop: 'rgba(0,0,0,0.35)',
  modalOverlay: 'rgba(0,0,0,0.65)',
  toastBackground: 'rgba(240,240,240,0.95)',
  toastText: '#1F2937',
  spinner: '#0A84FF',
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}
