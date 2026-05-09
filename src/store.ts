import { create } from 'zustand';
import { User } from 'firebase/auth';

export interface DocumentRecord {
  id: string;
  letterNo: string;
  branch: string;
  dateOfReceipt: string;
  description: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  userId: string;
}

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  documents: DocumentRecord[];
  setDocuments: (docs: DocumentRecord[]) => void;
  addDocument: (doc: DocumentRecord) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  documents: [],
  setDocuments: (documents) => set({ documents }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
}));