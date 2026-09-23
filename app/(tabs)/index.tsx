import { styles } from '@/styles/map-screen';
import Slider from '@react-native-community/slider';
import * as Location from 'expo-location';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated, Easing, Image, ImageSourcePropType, ImageStyle, Keyboard,
  Modal,
  StyleProp, StyleSheet, Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Circle } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import SearchBar, { Suggestion } from '../../components/SearchBar';

const API_URL = "https://api.zebaguette.xyz";

type MapPoint = { latitude: number; longitude: number; avg_noise: number | null; avg_crowd: number | null };
type ClusteredPoint = MapPoint & { radius: number };

// Nombre minimum de points dans une cellule pour les fusionner en un seul cercle
const MIN_CLUSTER_SIZE = 10;
// Rayon d'un point isolé (non regroupé), en mètres
const SINGLE_POINT_RADIUS = 150;

function clusterMapData(data: MapPoint[], delta: number): ClusteredPoint[] {
  let precision: number;
  let clusterRadius: number;
  if (delta < 0.05)      { precision = 3; clusterRadius = 150; }
  else if (delta < 0.2)  { precision = 2; clusterRadius = 800; }
  else                   { precision = 1; clusterRadius = 6000; }

  const clusters: Record<string, { gridLat: number; gridLon: number; points: MapPoint[] }> = {};

  for (const p of data) {
    const gLat = parseFloat(p.latitude.toFixed(precision));
    const gLon = parseFloat(p.longitude.toFixed(precision));
    const key = `${gLat},${gLon}`;
    if (!clusters[key]) clusters[key] = { gridLat: gLat, gridLon: gLon, points: [] };
    clusters[key].points.push(p);
  }

  const average = (values: (number | null)[]) => {
    const nums = values.filter((v): v is number => v != null);
    return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };

  return Object.values(clusters).flatMap(c => {
    // Pas assez de points : chaque point garde son propre cercle
    if (c.points.length < MIN_CLUSTER_SIZE) {
      return c.points.map(p => ({ ...p, radius: SINGLE_POINT_RADIUS }));
    }
    return [{
      latitude: c.gridLat,
      longitude: c.gridLon,
      avg_noise: average(c.points.map(p => p.avg_noise)),
      avg_crowd: average(c.points.map(p => p.avg_crowd)),
      radius: clusterRadius,
    }];
  });
}

// ─── SpeedDialItem ────────────────────────────────────────────────────────────
// Bouton secondaire du speed dial
type SpeedDialItemProps = {
  icon: string | ImageSourcePropType;
  onPress: () => void;
  anim: Animated.Value;
  active?: boolean;
  iconStyle?: StyleProp<ImageStyle>;
};

const SpeedDialItem: React.FC<SpeedDialItemProps> = ({ icon, onPress, anim, active, iconStyle }) => (
  <Animated.View
    style={[
      styles.sdRow,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      },
    ]}
  >
    <TouchableOpacity onPress={onPress} style={[styles.sdBtn, active && styles.sdBtnActive]} activeOpacity={0.8}>
      {typeof icon === 'string'
        ? <Text style={styles.sdBtnIcon}>{icon}</Text>
        : <Image source={icon} style={[styles.sdBtnImage, iconStyle]} />}
    </TouchableOpacity>
  </Animated.View>
);

// ─── FilterChip ───────────────────────────────────────────────────────────────
// Sous-option de filtre (foule / bruit / Sensitive), taille réduite
type FilterChipProps = {
  icon: string | ImageSourcePropType;
  active: boolean;
  onPress: () => void;
  anim: Animated.Value;
  iconStyle?: StyleProp<ImageStyle>;
};

const FilterChip: React.FC<FilterChipProps> = ({ icon, active, onPress, anim, iconStyle }) => (
  <Animated.View
    style={[
      styles.sdRow,
      {
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      },
    ]}
  >
    <TouchableOpacity onPress={onPress} style={[styles.sdChip, active && styles.sdChipActive]} activeOpacity={0.8}>
      {typeof icon === 'string'
        ? <Text style={styles.sdChipIcon}>{icon}</Text>
        : <Image source={icon} style={[styles.sdChipImage, iconStyle]} />}
    </TouchableOpacity>
  </Animated.View>
);

// ─── LevelSlider ──────────────────────────────────────────────────────────────
// Curseur 1-5 avec l'image correspondant au niveau sélectionné
const CROWD_LEVEL_IMAGES: ImageSourcePropType[] = [
  require('../../assets/images/Foule/foule-1-removebg-preview.png'),
  require('../../assets/images/Foule/foule-2-emoji-removebg-preview.png'),
  require('../../assets/images/Foule/foule-3-group-removebg-preview.png'),
  require('../../assets/images/Foule/foule-4-group-removebg-preview.png'),
  require('../../assets/images/Foule/crowd_teal_5people-removebg-preview.png'),
];
const NOISE_LEVEL_IMAGES: ImageSourcePropType[] = [
  require('../../assets/images/Bruit/speaker_1bar-removebg-preview.png'),
  require('../../assets/images/Bruit/speaker_2bar-removebg-preview.png'),
  require('../../assets/images/Bruit/speaker_3bar-removebg-preview.png'),
  require('../../assets/images/Bruit/speaker_4bar-removebg-preview.png'),
  require('../../assets/images/Bruit/speaker_5bar-removebg-preview.png'),
];

type LevelSliderProps = {
  value: string; // '1' à '5'
  onChange: (value: string) => void;
  color: string;
  images: ImageSourcePropType[];
};

const LevelSlider: React.FC<LevelSliderProps> = ({ value, onChange, color, images }) => {
  const level = parseInt(value);
  return (
    <View style={styles.levelSliderBlock}>
      <View style={styles.levelSliderImageBox}>
        <Image source={images[level - 1]} style={styles.levelSliderImage} />
      </View>
      <Slider
        style={styles.levelSlider}
        minimumValue={1}
        maximumValue={5}
        step={1}
        value={level}
        onValueChange={(v) => onChange(String(Math.round(v)))}
        minimumTrackTintColor={color}
        maximumTrackTintColor="#ddd"
        thumbTintColor={color}
        tapToSeek
      />
      <View style={styles.levelSliderTicks}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Text key={n} style={[styles.levelSliderTick, level === n && { color, fontWeight: 'bold' }]}>{n}</Text>
        ))}
      </View>
    </View>
  );
};

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [mapData, setMapData] = useState([]);
  const [filter, setFilter] = useState('both');
  const [modalVisible, setModalVisible] = useState(false);
  const [noiseInput, setNoiseInput] = useState('1');
  const [crowdInput, setCrowdInput] = useState('1');
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
  const fi3Anim = useRef(new Animated.Value(0)).current;   // Sensitive

  const fabRotation = fabRotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  // ── Toast de confirmation ─────────────────────────────────────────────────
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message: string) => {
    setToastMessage(message);
    toastAnim.stopAnimation();
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(({ finished }) => { if (finished) setToastMessage(null); });
  };

  const FILTER_ICON: Record<string, string | ImageSourcePropType> = {
    noise: require('../../assets/images/Bruit/speaker_5bar-removebg-preview.png'),
    crowd: require('../../assets/images/Foule/crowd_teal_5people-removebg-preview.png'),
    both: require('../../assets/images/noisy_crowd_teal-removebg-preview.png'),
  };

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
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Erreur', 'Permission de localisation refusée'); return; }
      // watchPositionAsync ne déclenche son callback qu'après un déplacement de
      // distanceInterval mètres : sans ce premier point, la carte ne s'affiche jamais.
      try {
        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (cancelled) return;
        setLocation(initial.coords);
        fetchMapData(initial.coords.latitude, initial.coords.longitude);
      } catch {
        Alert.alert('Erreur', 'Impossible de récupérer votre position.');
        return;
      }
      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
        (loc) => { setLocation(loc.coords); fetchMapData(loc.coords.latitude, loc.coords.longitude); },
      );
    })();
    return () => { cancelled = true; subscription?.remove(); };
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
      setNoiseInput('1');
      setCrowdInput('1');
      fetchMapData(location.latitude, location.longitude);
      showToast("Merci d'avoir noté ce lieu 👍");
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
      {!location && (
        <View style={styles.mapPlaceholder}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.mapPlaceholderText}>Localisation en cours…</Text>
        </View>
      )}
      {location && (
        <MapView
          ref={mapRef}
          style={styles.map}
          showsUserLocation={true}
          userInterfaceStyle="light"
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
              onPress={() => closeFab(() => setModalVisible(true))}
              anim={item1Anim}
            />
            <View style={{ height: 12 }} />
            {/* Affichage Carte — affiche l'icône du filtre actif */}
            <SpeedDialItem
              icon={FILTER_ICON[filter]}
              iconStyle={filter === 'noise' && styles.sdBtnImageSmall}
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
            <FilterChip icon={require('../../assets/images/Foule/crowd_teal_5people-removebg-preview.png')} active={filter === 'crowd'} onPress={() => applyFilter('crowd')} anim={fi1Anim} />
            <View style={{ height: 8 }} />
            <FilterChip icon={require('../../assets/images/Bruit/speaker_5bar-removebg-preview.png')} iconStyle={styles.sdChipImageSmall} active={filter === 'noise'} onPress={() => applyFilter('noise')} anim={fi2Anim} />
            <View style={{ height: 8 }} />
            <FilterChip icon={require('../../assets/images/noisy_crowd_teal-removebg-preview.png')} active={filter === 'both'}  onPress={() => applyFilter('both')}  anim={fi3Anim} />
          </>
        )}

      </View>
      {/* ── Fin Speed Dial ─────────────────────────────────────────────────── */}

      {/* Toast de confirmation (disparaît tout seul) */}
      {toastMessage && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            {
              bottom: insets.bottom + 96,
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

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
            <Text style={styles.title}>Évaluer le lieu</Text>
            <LevelSlider
              value={crowdInput}
              onChange={setCrowdInput}
              color="#45a9a7"
              images={CROWD_LEVEL_IMAGES}
            />
            <LevelSlider
              value={noiseInput}
              onChange={setNoiseInput}
              color="#203840"
              images={NOISE_LEVEL_IMAGES}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.submitBtn} onPress={submitEvaluation}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Valider</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => { setModalVisible(false); setNoiseInput('1'); setCrowdInput('1'); }}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

