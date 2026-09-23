import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  mapPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f2f2f7',
  },
  mapPlaceholderText: { fontSize: 15, color: '#666' },

  // ── Backdrop ────────────────────────────────────────────────────────────────
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.18)',
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
    backgroundColor: 'white',
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
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
  },
  sdBtnActive: {
    backgroundColor: '#E8F2FF',
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
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 6,
  },
  sdChipActive: {
    backgroundColor: '#007AFF',
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
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  levelFilterBtnText: { fontSize: 16, fontWeight: 'bold', color: '#555' },
  levelFilterBtnTextActive: { color: '#007AFF' },

  // ── Toast ────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(32,56,64,0.92)',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  toastText: { color: 'white', fontSize: 14, fontWeight: '600' },

  // ── Modals ───────────────────────────────────────────────────────────────
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 30,
    padding: 25,
    borderRadius: 15,
  },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 5, color: '#333' },
  ratingRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  ratingBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center',
  },
  ratingBtnActive: { backgroundColor: '#007AFF' },
  ratingBtnText: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  ratingBtnTextActive: { color: 'white' },
  levelSliderBlock: { marginBottom: 20 },
  levelSliderImageBox: { height: 72, alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
  levelSliderImage: { width: 72, height: 72, resizeMode: 'contain' },
  levelSlider: { width: '100%', height: 40 },
  levelSliderTicks: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12 },
  levelSliderTick: { fontSize: 12, color: '#999' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  submitBtn: {
    backgroundColor: '#007AFF', padding: 15, borderRadius: 10,
    flex: 1, marginRight: 5, alignItems: 'center',
  },
  cancelBtn: {
    padding: 15, borderRadius: 10, flex: 1, marginLeft: 5,
    alignItems: 'center', borderWidth: 1, borderColor: 'red',
  },
});
