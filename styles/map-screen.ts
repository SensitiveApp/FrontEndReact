import { Palette, usePalette } from '@/constants/colors';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';

// Styles de l'écran carte, recalculés quand le téléphone passe en clair / sombre
export function useMapStyles() {
  const colors = usePalette();
  return useMemo(() => createStyles(colors), [colors]);
}

const createStyles = (c: Palette) => StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Backdrop ────────────────────────────────────────────────────────────────
  backdrop: {
    backgroundColor: c.backdrop,
  },

  // ── Speed Dial container ─────────────────────────────────────────────────
  fabSpeedDial: {
    position: 'absolute',
    right: 24,
    flexDirection: 'column-reverse', // 1er enfant = bas, suivants = vers le haut
    alignItems: 'center',
  },

  // ── Main FAB ─────────────────────────────────────────────────────────────
  mainFab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  mainFabIcon: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  },

  // ── Speed dial items (Nouvelle Note / Affichage Carte) ───────────────────
  sdRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sdBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  sdBtnActive: {
    backgroundColor: c.surfaceActive,
  },
  sdBtnIcon: { fontSize: 22 },
  sdBtnImage: { 
    width: 50, 
    height: 50, 
    resizeMode: 'contain' 
  },
  sdBtnImageSmall: {
    width: 32,
    height: 32,
  },

  // ── Filter chips (Foule / Bruit / Les deux) ──────────────────────────────
  sdChip: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
  },
  sdChipActive: {
    backgroundColor: c.primary,
  },
  sdChipIcon: { fontSize: 18 },
  sdChipImage: { 
    width: 44, 
    height: 44, 
    resizeMode: 'contain' 
  },
  sdChipImageSmall: {
    width: 28,
    height: 28,
  },

  // ── Filtre niveau maximum ────────────────────────────────────────────────
  levelFilterBtn: {
    position: 'absolute',
    right: 8,
    width: 40,
    height: 40,
    borderRadius: 4,
    backgroundColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  levelFilterBtnText: { fontSize: 16, fontWeight: 'bold', color: c.textSecondary },
  levelFilterBtnTextActive: { color: c.primary },

  // ── Toast ────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: c.toastBackground,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: c.toastText, fontSize: 14, fontWeight: '600' },

  // ── Modals ───────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: c.modalOverlay,
  },
  modalContent: {
    backgroundColor: c.surface,
    margin: 30,
    padding: 25,
    borderRadius: 15,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: c.text },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: c.text },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  ratingBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: c.surfaceMuted, alignItems: 'center', justifyContent: 'center',
  },
  ratingBtnActive: { backgroundColor: c.primary },
  ratingBtnText: { fontSize: 18, fontWeight: 'bold', color: c.text },
  ratingBtnTextActive: { color: c.onPrimary },
  levelSliderBlock: { marginBottom: 20 },
  levelSliderImageBox: { height: 72, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  levelSliderImage: { width: 72, height: 72, resizeMode: 'contain' },
  levelSlider: { width: '100%', height: 40 },
  levelSliderTicks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  levelSliderTick: { fontSize: 12, color: c.textMuted },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  submitBtn: {
    backgroundColor: c.primary, padding: 15, borderRadius: 10,
    flex: 1, marginRight: 5, alignItems: 'center',
  },
  cancelBtn: {
    padding: 15, borderRadius: 10, flex: 1, marginLeft: 5,
    alignItems: 'center', borderWidth: 1, borderColor: c.danger,
  },
});
