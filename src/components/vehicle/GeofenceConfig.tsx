import {
  View, Text, StyleSheet,
  TextInput,
} from 'react-native';
import { useEffect, useRef, useState } from 'react';
import OsmMapView from '../../components/map/OsmMapView';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { CardShadow } from '../../theme/shadows';
import Chip from '../ui/Chip';
import Button from '../ui/Button';
import { vehicleService } from '../../services/vehicleService';
import { getErrorMessage } from '../../utils/errors';
import { useToastStore } from '../../store/toastStore';
import { MAPTILER_TILE_URL } from '../../constants/mapTiles';
import { useI18n } from '../../i18n';

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
  const { tr } = useI18n();
  const defaultCenter = vehiclePosition ?? { latitude: 3.848, longitude: 11.502 };

  const [nom,     setNom]    = useState(current?.nom ?? tr('Zone principale', 'Main zone'));
  const [center,  setCenter] = useState({
    latitude:  current?.centreLat  ?? defaultCenter.latitude,
    longitude: current?.centreLon  ?? defaultCenter.longitude,
  });
  const [rayon,   setRayon]  = useState(current?.rayonMetres ?? 500);
  const [saving,  setSaving] = useState(false);

  // `center` n'était initialisé qu'une seule fois au montage (useState). Si
  // l'onglet "Zone" s'ouvre avant qu'une position live n'arrive (dispositif
  // tout juste ajouté, pas encore de fix GPS), le centre retombait sur
  // Yaoundé codé en dur et ne se resynchronisait jamais même une fois
  // `vehiclePosition` reçu — risque d'enregistrer une zone centrée sur
  // Yaoundé en pensant qu'elle l'est sur le véhicule. On resynchronise tant
  // qu'il n'y a ni zone déjà enregistrée, ni déplacement manuel du repère.
  const touchedRef = useRef(false);
  useEffect(() => {
    if (current || touchedRef.current || !vehiclePosition) return;
    setCenter({ latitude: vehiclePosition.latitude, longitude: vehiclePosition.longitude });
  }, [vehiclePosition, current]);

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
      useToastStore.getState().show(
        getErrorMessage(err, tr('Impossible d’enregistrer la zone de sécurité. Réessayez dans un instant.', 'Unable to save the safety zone. Try again in a moment.')),
        'danger'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{tr('Zone de sécurité', 'Safety zone')}</Text>
      <Text style={styles.sub}>
        {tr('Définissez un périmètre autorisé. Une alerte sera envoyée si le véhicule sort de cette zone.', 'Define an authorised perimeter. An alert will be sent if the vehicle leaves this zone.')}
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
          tileUrlTemplate={MAPTILER_TILE_URL}
          markers={vehiclePosition ? [
            { id: 'vehicle', latitude: vehiclePosition.latitude, longitude: vehiclePosition.longitude, color: Colors.info, label: tr('Véhicule', 'Vehicle') },
          ] : []}
          editableCircle={{ center, radiusMeters: rayon, color: Colors.primary }}
          onCircleChange={(newCenter) => { touchedRef.current = true; setCenter(newCenter); }}
        />

        {/* Indication d'usage */}
        <View style={styles.hintBadge}>
          <Ionicons name="move-outline" size={13} color={Colors.primary} />
          <Text style={styles.hintText}>{tr('Faites glisser le repère pour déplacer la zone', 'Drag the marker to move the zone')}</Text>
        </View>
      </View>

      {/* NOM */}
      <View style={styles.field}>
        <Text style={styles.fieldLabel}>{tr('Nom de la zone', 'Zone name')}</Text>
        <View style={styles.inputBox}>
          <Ionicons name="bookmark-outline" size={16} color={Colors.primary} />
          <TextInput
            style={styles.input}
            value={nom}
            onChangeText={setNom}
            placeholder={tr('Ex: Zone port de Douala', 'E.g. Douala port zone')}
            placeholderTextColor={Colors.textMuted}
          />
        </View>
      </View>

      {/* RAYON */}
      <View>
        <Text style={styles.fieldLabel}>{tr('Rayon de la zone', 'Zone radius')}</Text>
        <View style={styles.rayonDisplay}>
          <Text style={styles.rayonValue}>{rayon >= 1000 ? `${(rayon/1000).toFixed(1)} km` : `${rayon} m`}</Text>
        </View>
        <View style={styles.presets}>
          {RAYON_PRESETS.map(p => (
            <Chip
              key={p}
              label={p >= 1000 ? `${p/1000}km` : `${p}m`}
              selected={rayon === p}
              onPress={() => setRayon(p)}
              style={styles.preset}
            />
          ))}
        </View>
      </View>

      {/* INFO ACTUELLE */}
      {current && (
        <View style={styles.currentInfo}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
          <Text style={styles.currentInfoText}>
            {tr('Zone actuelle', 'Current zone')} : {current.nom} — {tr('rayon', 'radius')} {current.rayonMetres}m
          </Text>
        </View>
      )}

      {/* SAUVEGARDER */}
      <Button
        label={tr('Appliquer la zone', 'Apply zone')}
        onPress={handleSave}
        loading={saving}
        disabled={!nom.trim()}
      />
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
    ...CardShadow,
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
    flex:       1,
    minWidth:   '28%',
    alignItems: 'center',
  },

  currentInfo: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    backgroundColor: Colors.primaryLight,
    borderRadius:    8,
    padding:         10,
  },
  currentInfoText: { fontSize: 12, color: Colors.primary },
});
