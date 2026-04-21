import { useEffect, useState } from 'react';
import { useLanguageStore } from '@/store/useLanguageStore';

export function useLanguageInit() {
  const [isReady, setIsReady] = useState(
    () => useLanguageStore.persist.hasHydrated()
  );
  const applyStoredLanguage = useLanguageStore((s) => s.applyStoredLanguage);

  useEffect(() => {
    if (useLanguageStore.persist.hasHydrated()) {
      applyStoredLanguage();
      setIsReady(true);
      return;
    }

    const unsub = useLanguageStore.persist.onFinishHydration(() => {
      applyStoredLanguage();
      setIsReady(true);
    });

    return unsub;
  }, [applyStoredLanguage]);

  return isReady;
}
