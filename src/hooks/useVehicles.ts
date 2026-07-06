import { useEffect, useCallback } from 'react';
import { vehicleService } from '../services/vehicleService';
import { useVehicleStore } from '../store/vehicleStore';

export const useVehicles = () => {
  const { vehicles, setVehicles, setLoading, isLoading } = useVehicleStore();

  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await vehicleService.getVehicles();
      setVehicles(data);
    } catch (err) {
      console.error('[useVehicles]', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
  }, []);

  return { vehicles, isLoading, refetch: fetchVehicles };
};