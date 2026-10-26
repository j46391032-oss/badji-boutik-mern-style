import { createContext, useContext, useEffect, useState } from 'react';
import api from '../api.js';

const DEFAULTS = { shopName: 'Boutik', announcement: '', shippingFee: 0, freeShippingThreshold: 0, returnDays: 7, supportPhone: '', supportEmail: '' };
const SettingsContext = createContext({ settings: DEFAULTS, reload: () => {} });
export const useSettings = () => useContext(SettingsContext);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULTS);
  const reload = () => api.get('/settings').then((r) => setSettings({ ...DEFAULTS, ...r.data })).catch(() => {});
  useEffect(() => {
    reload();
  }, []);
  return <SettingsContext.Provider value={{ settings, reload }}>{children}</SettingsContext.Provider>;
}
