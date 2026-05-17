import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TabValue = string;

type TabState = {
  activeState: Record<string, TabValue>;
  setState: (type: string, value: TabValue) => void;
};

export const usePersistentTab = create<TabState>()(
  persist(
    (set) => ({
      activeState: {},
      setState: (type, value) =>
        set((state) => ({
          activeState: { ...state.activeState, [type]: value },
        })),
    }),
    {
      name: 'persistent-tab',
    }
  )
);

export const useTab = create<TabState>((set) => ({
  activeState: {},
  setState: (type, value) =>
    set((state) => ({
      activeState: { ...state.activeState, [type]: value },
    })),
}));
