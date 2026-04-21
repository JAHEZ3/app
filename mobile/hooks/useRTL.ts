import { useLanguageStore } from '@/store/useLanguageStore';

export function useRTL() {
  return useLanguageStore((state) => state.isRTL);
}
