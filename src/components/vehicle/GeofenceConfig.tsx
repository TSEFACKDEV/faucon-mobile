import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useState } from 'react';
import MapView, { Circle, Marker, UrlTile, MapPressEvent } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { vehicleService } from '../../services/vehicleService';

interface GeofenceData {
  nom:         string;
  centreLat:   number;
  centreLon:   number;
  rayonMetres: number;
  estActif:    boolean;
}

interface Props {
  vehiculeId:       string;
  current:          GeofenceData | null;
  vehiclePosition:  { latitude: number; longitude: number } | null;
  onUpdated:        (geofence: GeofenceData) => void;
}

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

const RAYON_PRESETS = [100, 250, 500, 1000, 2000, 5000];

export default function GeofenceConfig({
  vehiculeId, current, vehiclePosition, onUpdated,
}: Props) {
  const defaultCenter = vehiclePosition ?? { latitude: 3.848, longitude: 11.502 };

  const [nom,     setNom]    = useState(current?.nom ?? 'Zone principale');
  const [center,  setCenter] = useState({
    latitude:  current?.centreLat  ?? defaultCenter.latitude,
    longitude: current?.centreLon  ?? defaultCenter.longitude,
  });
  const [rayon,   setRayon]  = useState(current?.rayonMetres ?? 500);
  const [saving,  setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  const handleMapPress = (e: MapPressEvent) => {
    if (!editing) return;
    setCenter({
      latitude:  e.nativeEvent.coordinate.latitude,
      longitude: e.nativeEvent.coordinate.longitude,
    });
  };

  const handleSave = async () => {
    if (!nom.trim()) return;
    setSaving(true);
    try {
      await vehicleService.setGeofence(
        vehiculeId, nom, center.latitude, center.longitude, rayon
      );
      onUpdated({
        nom, centreLat: center.latitude,
        centreLon: center.longitude, rayonMetres: rayon, estActif: true,
      });
      setEditing(false);
    } catch (err) {
      console.error('[GeofenceConfig]', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Zone de sécurité</Text>
      <Text style={styles.sub}>
        Définissez un périmètre autorisé. Une alerte sera envoyée si le véhicule sort de cette zone.
      </Text>

      {/* CARTE INTERACTIVE */}
      <View style={styles.mapWrapper}>
        <MapView
          style={StyleSheet.absoluteFill}
          region={{
            latitude:       center.latitude,
            longitude:      center.longitude,
            latitudeDelta:  (rayon / 111000) * 4,
            longitudeDelta: (rayon / 111000) * 4,
          }}
          onPress={handleMapPress}
        >
          <UrlTile urlTemplate={OSM_URL} maximumZ={19} flipY={false} />

          {/* Cercle géofence */}
          <Circle
            center={center}
            radius={rayon}
            fillColor="rgba(0,122,61,0.12)"
            strokeColor={Colors.primary}
            strokeWidth={2}
          />

          {/* Centre géofence */}
          <Marker coordinate={center} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.centerMarker}>
              <Ionicons name="location" size={20} color={Colors.primary} />
            </View>
          </Marker>

          {/* Position véhicule */}
          {vehiclePosition && (
            <Marker coordinate={vehiclePosition} anchor={{ x: 0.5, y: 0.5 }}>
              <View style={styles.vehicleMarker}>
                <Text style={{ fontSize: 14 }}>🚛</Text>
              </View>
            </Marker>
          )}
        </MapView>

        {/* Badge mode édition */}
        <View style={styles.editBadge}>
          <TouchableOpacity
            style={[styles.editBtn, editing && styles.editBtnActive]}
            onPress={() => setEditing(!editing)}
          >
            <Ionicons
              name={editing ? 'checkmark' : 'pencil-outline'}
              size={14}
              color={editing ? Colors.white : Colors.primary}
            />
            <Text style={[styles.editBtnText, editing && { color: Colors.white }]}>
              {editing ? 'Tap sur carte pour repositionner' : 'Modifier le centre'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* NOM */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>Nom de la zone</Text>
        <View style={styles.inputBox}>
          <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder="Ex: Zone port de Douala"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* RAYON */}
      <View>
        <Text style={styles.fieldLabel}>Rayon de la zone</Text>
        <View style={styles.rayonDisplay}>
          <Text style={styles.rayonValue}>{rayon >= 1000 ? `${(rayon/1000).toFixed(1)} km` : `${rayon} m`}</Text>
        </View>
        <View style={styles.presets}>
          {RAYON_PRESETS.map(p => (
            <TouchableOpacity
              key={p}
              style={[styles.preset, rayon === p && styles.presetActive]}
              onPress={() => setRayon(p)}
            >
              <Text style={[styles.presetText, rayon === p && styles.presetTextActive]}>
                {p >= 1000 ? `${p/1000}km` : `${p}m`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* INFO ACTUELLE */}
      {current && (
        <View style={styles.currentInfo}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
          <Text style={styles.currentInfoText}>
            Zone actuelle : {current.nom} — rayon {current.rayonMetres}m
          </Text>
        </View>
      )}

      {/* SAUVEGARDER */}
      <TouchableOpacity
        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
        onPress={handleSave}
        disabled={saving || !nom.trim()}
      >
        {saving ? (
          <ActivityIndicator color={Colors.white} size="small" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color={Colors.white} />
            <Text style={styles.saveBtnText}>Appliquer la zone</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  title:     { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  sub:       { fontSize: 13, color: Colors.textSecondary, lineHeight: 19 },

  mapWrapper: {
    height:          220,
    borderRadius:    14,
    overflow:        'hidden',
    position:        'relative',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  centerMarker: {
    backgroundColor: Colors.white,
    borderRadius:    16,
    padding:         4,
    shadowColor:     '#000',
    shadowOpacity:   0.15,
    shadowRadius:    4,
    elevation:       3,
  },
  vehicleMarker: {
    width:          32,
    height:         32,
    borderRadius:   16,
    backgroundColor: Colors.primary,
    borderWidth:    2,
    borderColor:    Colors.white,
    alignItems:     'center',
    justifyContent: 'center',
  },
  editBadge: { position: 'absolute', bottom: 8, left: 8, right: 8 },
  editBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.white,
    borderRadius:    8,
    paddingHorizontal: 10,
    paddingVertical:   6,
    alignSelf:       'flex-start',
    borderWidth:     1,
    borderColor:     Colors.primary,
  },
  editBtnActive:  { backgroundColor: Colors.primary },
  editBtnText:    { fontSize: 11, color: Colors.primary, fontWeight: '600' },

  field:      { gap: 6 },
  fieldLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase' },
  inputBox: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             10,
    backgroundColor: Colors.white,
    borderRadius:    10,
    borderWidth:     1.5,
    borderColor:     Colors.border,
    paddingHorizontal: 14,
    height:          48,
  },
  input: { flex: 1, fontSize: 14, color: Colors.textPrimary },

  rayonDisplay: { alignItems: 'center', paddingVertical: 8 },
  rayonValue:   { fontSize: 32, fontWeight: '700', color: Colors.primary, fontVariant: ['tabular-nums'] },

  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  preset: {
    flex:           1,
    minWidth:       '28%',
    backgroundColor: Colors.white,
    borderRadius:   10,
    borderWidth:    1,
    borderColor:    Colors.border,
    alignItems:     'center',
    paddingVertical: 10,
  },
  presetActive:     { backgroundColor: Colors.primary, borderColor: Colors.primary },
  presetText:       { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  presetTextActive: { color: Colors.white },

  currentInfo: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.primaryLight,
    borderRadius:    8,
    padding:         10,
  },
  currentInfoText: { fontSize: 12, color: Colors.primary },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius:    12,
    padding:         15,
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             8,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText:     { color: Colors.white, fontSize: 15, fontWeight: '600' },
});