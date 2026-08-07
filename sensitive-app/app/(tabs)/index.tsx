import React, { useState, useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  StyleSheet, Text, View, TouchableOpacity, Modal, Alert,
  Animated, Easing, Keyboard,
} from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import SearchBar, { Suggestion } from '../../components/SearchBar';

const API_URL = "https://api.zebaguette.xyz";

type MapPoint = { latitude: number; longitude: number; avg_noise: number | null; avg_crowd: number | null };
type ClusteredPoint = MapPoint & { radius: number };

function clusterMapData(data: MapPoint[], delta: number): ClusteredPoint[] {
  let precision: number;
  let clusterRadius: number;
  if (delta < 0.02)      { precision = 3; clusterRadius = 150; }
  else if (delta < 0.08) { precision = 2; clusterRadius = 800; }
  else                   { precision = 1; clusterRadius = 6000; }

  const clusters: Record<string, {
    gridLat: number; gridLon: number; origLat: number; origLon: number;
    noiseSum: number; noiseCount: number; crowdSum: number; crowdCount: number; count: number;
  }> = {};

  for (const p of data) {
    const gLat = parseFloat(p.latitude.toFixed(precision));
    const gLon = parseFloat(p.longitude.toFixed(precision));
    const key = `${gLat},${gLon}`;
    if (!clusters[key]) {
      clusters[key] = {
        gridLat: gLat, gridLon: gLon, origLat: p.latitude, origLon: p.longitude,
        noiseSum: 0, noiseCount: 0, crowdSum: 0, crowdCount: 0, count: 0,
      };
    }
    const c = clusters[key];
    c.count++;
    if (p.avg_noise != null) { c.noiseSum += p.avg_noise; c.noiseCount++; }
    if (p.avg_crowd != null) { c.crowdSum += p.avg_crowd; c.crowdCount++; }
  }

  return Object.values(clusters).map(c => ({
    latitude: c.count >= 2 ? c.gridLat : c.origLat,
    longitude: c.count >= 2 ? c.gridLon : c.origLon,
    avg_noise: c.noiseCount > 0 ? c.noiseSum / c.noiseCount : null,
    avg_crowd: c.crowdCount > 0 ? c.crowdSum / c.crowdCount : null,
    radius: c.count >= 2 ? clusterRadius : 150,
  }));
}

// ─── SpeedDialItem ────────────────────────────────────────────────────────────
// Bouton secondaire du speed dial avec label pill à gauche
type SpeedDialItemProps = {
  icon: string;
  label: string;
  onPress: () => void;
  anim: Animated.Value;
  active?: boolean;
};

const SpeedDialItem: React.FC<SpeedDialItemProps> = ({ icon, label, onPress, anim, active }) => (
  <Animated.View
    style={[
      styles.sdRow,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      },
    ]}
  >
    <View style={[styles.sdLabelPill, active && styles.sdLabelPillActive]}>
      <Text style={[styles.sdLabelText, active && styles.sdLabelTextActive]}>{label}</Text>
    </View>
    <View style={{ width: 10 }} />
    <TouchableOpacity onPress={onPress} style={[styles.sdBtn, active && styles.sdBtnActive]} activeOpacity={0.8}>
      <Text style={styles.sdBtnIcon}>{icon}</Text>
    </TouchableOpacity>
  </Animated.View>
);

// ─── FilterChip ───────────────────────────────────────────────────────────────
// Sous-option de filtre (foule / bruit / les deux), taille réduite
type FilterChipProps = {
  icon: string;
  label: string;
  active: boolean;
  onPress: () => void;
  anim: Animated.Value;
};

const FilterChip: React.FC<FilterChipProps> = ({ icon, label, active, onPress, anim }) => (
  <Animated.View
    style={[
      styles.sdRow,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      },
    ]}
  >
    <View style={[styles.sdLabelPill, active && styles.sdLabelPillActive]}>
      <Text style={[styles.sdLabelText, active && styles.sdLabelTextActive]}>{label}</Text>
    </View>
    <View style={{ width: 10 }} />
    <TouchableOpacity onPress={onPress} style={[styles.sdChip, active && styles.sdChipActive]} activeOpacity={0.8}>
      <Text style={styles.sdChipIcon}>{icon}</Text>
    </TouchableOpacity>
  </Animated.View>
);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mapData, setMapData] = useState([]);
  const [filter, setFilter] = useState('both');
  const [modalVisible, setModalVisible] = useState(false);
  const [noiseInput, setNoiseInput] = useState('');
  const [crowdInput, setCrowdInput] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [maxLevel, setMaxLevel] = useState<number | null>(null);
  const [levelModalVisible, setLevelModalVisible] = useState(false);
  const [latitudeDelta, setLatitudeDelta] = useState(0.02);
  const mapRef = useRef<MapView>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Speed dial state ──────────────────────────────────────────────────────
  const [fabMenuMounted, setFabMenuMounted] = useState(false);
  const [filterSubMounted, setFilterSubMounted] = useState(false);
  // Rotation du FAB principal (0° → 45° à l'ouverture)
  const fabRotateAnim = useRef(new Animated.Value(0)).current;
  // Items du menu principal
  const item1Anim = useRef(new Animated.Value(0)).current; // Nouvelle Note
  const item2Anim = useRef(new Animated.Value(0)).current; // Affichage Carte
  // Sous-items filtres
  const fi1Anim = useRef(new Animated.Value(0)).current;   // Foule
  const fi2Anim = useRef(new Animated.Value(0)).current;   // Bruit
  const fi3Anim = useRef(new Animated.Value(0)).current;   // Les deux

  const fabRotation = fabRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  const FILTER_LABEL: Record<string, string> = { noise: '🔊 Bruit', crowd: '👥 Foule', both: '✦ Les deux' };

  // ── Animations FAB ────────────────────────────────────────────────────────
  const openFab = () => {
    item1Anim.setValue(0);
    item2Anim.setValue(0);
    setFabMenuMounted(true);
    Animated.parallel([
      Animated.spring(fabRotateAnim, { toValue: 1, useNativeDriver: true, tension: 120, friction: 8 }),
      Animated.stagger(70, [
        Animated.spring(item1Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
        Animated.spring(item2Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      ]),
    ]).start();
  };

  const closeFab = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fabRotateAnim, { toValue: 0, duration: 200, useNativeDriver: true, easing: Easing.out(Easing.quad) }),
      Animated.timing(item1Anim,     { toValue: 0, duration: 140, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(item2Anim,     { toValue: 0, duration: 140, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(fi1Anim,       { toValue: 0, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(fi2Anim,       { toValue: 0, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(fi3Anim,       { toValue: 0, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]).start(({ finished }) => {
      if (finished) {
        setFabMenuMounted(false);
        setFilterSubMounted(false);
        callback?.();
      }
    });
  };

  const toggleFab = () => { fabMenuMounted ? closeFab() : openFab(); };

  // ── Animations filtre ─────────────────────────────────────────────────────
  const openFilterSub = () => {
    fi1Anim.setValue(0);
    fi2Anim.setValue(0);
    fi3Anim.setValue(0);
    setFilterSubMounted(true);
    Animated.stagger(55, [
      Animated.spring(fi1Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.spring(fi2Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
      Animated.spring(fi3Anim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 9 }),
    ]).start();
  };

  const closeFilterSub = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(fi1Anim, { toValue: 0, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(fi2Anim, { toValue: 0, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
      Animated.timing(fi3Anim, { toValue: 0, duration: 110, useNativeDriver: true, easing: Easing.in(Easing.quad) }),
    ]).start(({ finished }) => {
      if (finished) { setFilterSubMounted(false); callback?.(); }
    });
  };

  const toggleFilterSub = () => { filterSubMounted ? closeFilterSub() : openFilterSub(); };

  const applyFilter = (newFilter: string) => {
    setFilter(newFilter);
    closeFab();
  };

  // ── Localisation & données ────────────────────────────────────────────────
  useEffect(() => {
    let subscription: { remove: () => void } | undefined;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Erreur', 'Permission de localisation refusée'); return; }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (loc) => { setLocation(loc.coords); fetchMapData(loc.coords.latitude, loc.coords.longitude); },
      );
    })();
    return () => subscription?.remove();
  }, []);

  const fetchMapData = (lat: number, lon: number) => {
    if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
    fetchDebounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        const radius = Math.max(2, latitudeDelta * 111);
        const response = await fetch(`${API_URL}/map-data/?lat=${lat}&lon=${lon}&radius_km=${radius}`, { signal: controller.signal });
        clearTimeout(timeout);
        setMapData(await response.json());
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') { console.warn('fetchMapData timed out'); return; }
        console.error('Erreur Fetch:', error);
      }
    }, 500);
  };

  const submitEvaluation = async () => {
    if (!location) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const noise = noiseInput ? parseInt(noiseInput) : null;
    const crowd = crowdInput ? parseInt(crowdInput) : null;
    if (noise !== null && (isNaN(noise) || noise < 1 || noise > 5)) { Alert.alert('Erreur', 'Le niveau de bruit doit être entre 1 et 5.'); return; }
    if (crowd !== null && (isNaN(crowd) || crowd < 1 || crowd > 5)) { Alert.alert('Erreur', 'Le niveau de foule doit être entre 1 et 5.'); return; }
    if (noise === null && crowd === null) { Alert.alert('Erreur', 'Remplis au moins un champ.'); return; }
    try {
      const response = await fetch(`${API_URL}/evaluations/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ latitude: location.latitude, longitude: location.longitude, noise_level: noise, crowd_level: crowd }),
      });
      clearTimeout(timeout);
      if (!response.ok) {
        let message = "Impossible d'envoyer les données.";
        try { const err = await response.json(); message = err.detail ?? message; } catch {}
        Alert.alert(response.status === 429 ? 'Zone déjà notée' : 'Erreur', message);
        return;
      }
      setModalVisible(false);
      setNoiseInput('');
      setCrowdInput('');
      fetchMapData(location.latitude, location.longitude);
      Alert.alert('Merci !', 'Votre évaluation a été prise en compte.');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') { Alert.alert('Erreur', 'La requête a expiré. Vérifiez votre connexion.'); return; }
      Alert.alert('Erreur', "Impossible d'envoyer les données.");
    }
  };

  const fetchSuggestions = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`${API_URL}/places/autocomplete/?input=${encodeURIComponent(text)}`);
        const data = await response.json();
        setSuggestions(
          data.status === 'OK'
            ? data.predictions.map((p: any) => ({
                place_id: p.place_id,
                description: p.description,
                mainText: p.structured_formatting?.main_text,
                secondaryText: p.structured_formatting?.secondary_text,
              }))
            : [],
        );
      } catch { setSuggestions([]); }
    }, 300);
  };

  const selectSuggestion = async (placeId: string, description: string) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    setSearchQuery(description);
    setSuggestions([]);
    try {
      const response = await fetch(`${API_URL}/places/details/?place_id=${placeId}`, { signal: controller.signal });
      clearTimeout(timeout);
      const data = await response.json();
      if (data.status === 'OK') {
        const { lat, lng } = data.result.geometry.location;
        mapRef.current?.animateToRegion({ latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 800);
        fetchMapData(lat, lng);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') { Alert.alert('Erreur', 'La recherche a expiré. Vérifiez votre connexion.'); return; }
      Alert.alert('Erreur', 'Impossible de naviguer vers ce lieu.');
    }
  };

  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    if (suggestions.length > 0) { selectSuggestion(suggestions[0].place_id, suggestions[0].description); return; }
    try {
      const results = await Location.geocodeAsync(searchQuery);
      if (results.length === 0) { Alert.alert('Introuvable', 'Adresse non trouvée.'); return; }
      const { latitude, longitude } = results[0];
      mapRef.current?.animateToRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }, 800);
      fetchMapData(latitude, longitude);
    } catch { Alert.alert('Erreur', 'Impossible de rechercher cette adresse.'); }
  };

  const getColor = (value: number | null) => {
    if (!value) return 'rgba(200, 200, 200, 0.3)';
    if (value <= 1.5) return 'rgba(0, 255, 0, 0.5)';
    if (value <= 2.5) return 'rgba(173, 255, 47, 0.5)';
    if (value <= 3.5) return 'rgba(255, 255, 0, 0.5)';
    if (value <= 4.5) return 'rgba(255, 165, 0, 0.5)';
    return 'rgba(255, 0, 0, 0.5)';
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Carte */}
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          mapPadding={{ top: insets.top + 68, right: 0, bottom: 0, left: 0 }}
          initialRegion={{ latitude: location.latitude, longitude: location.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
          onPress={() => { Keyboard.dismiss(); if (fabMenuMounted) closeFab(); }}
          onRegionChangeComplete={(reg) => { setLatitudeDelta(reg.latitudeDelta); fetchMapData(reg.latitude, reg.longitude); }}
        >
          {clusterMapData(mapData, latitudeDelta).map((point: ClusteredPoint, index: number) => {
            let displayValue: number | null = null;
            if (filter === 'noise') displayValue = point.avg_noise ?? null;
            else if (filter === 'crowd') displayValue = point.avg_crowd ?? null;
            else {
              const values = [point.avg_noise, point.avg_crowd].filter((v): v is number => v != null);
              displayValue = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
            }
            if (displayValue === null) return null;
            if (maxLevel !== null && displayValue > maxLevel) return null;
            return (
              <Circle
                key={index}
                center={{ latitude: point.latitude, longitude: point.longitude }}
                radius={point.radius}
                fillColor={getColor(displayValue)}
                strokeWidth={0}
              />
            );
          })}
        </MapView>
      )}

      {/* Barre de recherche */}
      <SearchBar
        value={searchQuery}
        onChangeText={fetchSuggestions}
        onSubmit={searchAddress}
        onClear={() => { setSearchQuery(''); setSuggestions([]); }}
        suggestions={suggestions}
        onSelectSuggestion={selectSuggestion}
        style={{ top: insets.top + 12 }}
      />

      {/* Backdrop : ferme le menu au tap en dehors */}
      {fabMenuMounted && (
        <TouchableOpacity
          style={[StyleSheet.absoluteFill, styles.backdrop]}
          activeOpacity={1}
          onPress={() => closeFab()}
        />
      )}

      {/* Filtre niveau maximum */}
      <TouchableOpacity
        style={[styles.levelFilterBtn, { top: insets.top + 124 }]}
        onPress={() => setLevelModalVisible(true)}
      >
        <Text style={[styles.levelFilterBtnText, maxLevel !== null && styles.levelFilterBtnTextActive]}>
          {maxLevel !== null ? String(maxLevel) : '▽'}
        </Text>
      </TouchableOpacity>

      {/* ── Speed Dial FAB ──────────────────────────────────────────────────── */}
      {/*
        flexDirection: 'column-reverse' → le premier enfant (MainFAB) est ancré
        en bas, les suivants s'empilent vers le haut automatiquement.
      */}
      <View style={[styles.fabSpeedDial, { bottom: insets.bottom + 16 }]}>

        {/* MainFAB — toujours visible */}
        <TouchableOpacity onPress={toggleFab} style={styles.mainFab} activeOpacity={0.85}>
          <Animated.Image
            source={require('../../assets/images/Sensitive-logo-2-transparentbg.png')}
            style={[styles.mainFabIcon, { transform: [{ rotate: fabRotation }] }]}
          />
        </TouchableOpacity>

        {/* Items du menu principal (montés à l'ouverture) */}
        {fabMenuMounted && (
          <>
            <View style={{ height: 16 }} />
            {/* Nouvelle Note */}
            <SpeedDialItem
              icon="✏️"
              label="Nouvelle Note"
              onPress={() => closeFab(() => setModalVisible(true))}
              anim={item1Anim}
            />
            <View style={{ height: 12 }} />
            {/* Affichage Carte — affiche le filtre actif en label */}
            <SpeedDialItem
              icon="🧭"
              label={FILTER_LABEL[filter]}
              onPress={toggleFilterSub}
              anim={item2Anim}
              active={filterSubMounted}
            />
          </>
        )}

        {/* Sous-menu filtres (montés au tap sur Affichage Carte) */}
        {filterSubMounted && (
          <>
            <View style={{ height: 12 }} />
            {/* Ordre JSX = ordre d'apparition bas→haut grâce à column-reverse */}
            <FilterChip icon="👥" label="Foule"    active={filter === 'crowd'} onPress={() => applyFilter('crowd')} anim={fi1Anim} />
            <View style={{ height: 8 }} />
            <FilterChip icon="🔊" label="Bruit"    active={filter === 'noise'} onPress={() => applyFilter('noise')} anim={fi2Anim} />
            <View style={{ height: 8 }} />
            <FilterChip icon="✦"  label="Les deux" active={filter === 'both'}  onPress={() => applyFilter('both')}  anim={fi3Anim} />
          </>
        )}

      </View>
      {/* ── Fin Speed Dial ─────────────────────────────────────────────────── */}

      {/* Modal : niveau maximum affiché */}
      <Modal visible={levelModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalContainer} activeOpacity={1} onPress={() => setLevelModalVisible(false)}>
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.title}>Niveau maximum affiché</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.ratingBtn, maxLevel === n && styles.ratingBtnActive]}
                  onPress={() => { setMaxLevel(n); setLevelModalVisible(false); }}
                >
                  <Text style={[styles.ratingBtnText, maxLevel === n && styles.ratingBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {maxLevel !== null && (
              <TouchableOpacity onPress={() => { setMaxLevel(null); setLevelModalVisible(false); }} style={{ alignItems: 'center', paddingTop: 8 }}>
                <Text style={{ color: 'red', fontSize: 14 }}>Annuler le filtre</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Modal : nouvelle évaluation */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.title}>Évaluer le lieu (1 à 5)</Text>
            <Text style={styles.label}>👥 Niveau de Foule</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.ratingBtn, crowdInput === String(n) && styles.ratingBtnActive]}
                  onPress={() => setCrowdInput(String(n))}
                >
                  <Text style={[styles.ratingBtnText, crowdInput === String(n) && styles.ratingBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>🔊 Niveau de Bruit</Text>
            <View style={styles.ratingRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.ratingBtn, noiseInput === String(n) && styles.ratingBtnActive]}
                  onPress={() => setNoiseInput(String(n))}
                >
                  <Text style={[styles.ratingBtnText, noiseInput === String(n) && styles.ratingBtnTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.submitBtn} onPress={submitEvaluation}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setNoiseInput(''); setCrowdInput(''); }}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Backdrop ────────────────────────────────────────────────────────────────
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.18)',
  },

  // ── Speed Dial container ─────────────────────────────────────────────────
  fabSpeedDial: {
    position: 'absolute',
    right: 24,
    flexDirection: 'column-reverse', // 1er enfant = bas, suivants = vers le haut
    alignItems: 'flex-end',
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
  sdLabelPill: {
    backgroundColor: 'white',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  sdLabelPillActive: {
    backgroundColor: '#007AFF',
  },
  sdLabelText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  sdLabelTextActive: {
    color: 'white',
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
