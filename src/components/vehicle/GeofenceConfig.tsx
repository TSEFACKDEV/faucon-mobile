import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useState } from 'react';
import OsmMapView from '../../components/map/OsmMapView';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { vehicleService } from '../../services/vehicleService';
import { ROUTE_TILE_URL } from '../../constants/mapTiles';

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
        <OsmMapView
          style={StyleSheet.absoluteFill}
          initialRegion={{
            latitude:       center.latitude,
            longitude:      center.longitude,
            latitudeDelta:  (rayon / 111000) * 4,
            longitudeDelta: (rayon / 111000) * 4,
          }}
          tileUrlTemplate={ROUTE_TILE_URL}
          markers={vehiclePosition ? [
            { id: 'vehicle', latitude: vehiclePosition.latitude, longitude: vehiclePosition.longitude, color: Colors.info, label: 'Véhicule' },
          ] : []}
          editableCircle={{ center, radiusMeters: rayon, color: Colors.primary }}
          onCircleChange={(newCenter) => setCenter(newCenter)}
        />

        {/* Indication d'usage */}
        <View style={styles.hintBadge}>
          <Ionicons name="move-outline" size={13} color={Colors.primary} />
          <Text style={styles.hintText}>Faites glisser le repère pour déplacer la zone</Text>
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
  hintBadge: {
    position: 'absolute', bottom: 8, left: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.white, borderRadius: 8,
    paddingHorizontal: 10, paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  hintText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },

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
