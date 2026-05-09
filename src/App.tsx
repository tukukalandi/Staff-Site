import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, signIn } from './firebase';
import { useAppStore, DocumentRecord } from './store';
import { AppLayout } from './components/layout/AppLayout';
import { OfficialCorrespondance } from './pages/OfficialCorrespondance';
import { AdminPortal } from './pages/AdminPortal';
import { GenericPage } from './pages/GenericPage';

export default function App() {
  const setUser = useAppStore(state => state.setUser);
  const setDocuments = useAppStore(state => state.setDocuments);
  const [loading, setLoading] = useState(true);

  const [signInError, setSignInError] = useState<string | null>(null);

  const handleSignIn = async () => {
    try {
      setSignInError(null);
      await signIn();
    } catch (error) {
      console.error('Sign-in error:', error);
      setSignInError((error as Error).message);
    }
  };

  useEffect(() => {
    let unsubscribeDocs: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);

      // Clean up previous listener if it exists
      if (unsubscribeDocs) {
        unsubscribeDocs();
        unsubscribeDocs = undefined;
      }

      if (user) {
        const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
        unsubscribeDocs = onSnapshot(q, (snapshot) => {
          const docs: DocumentRecord[] = [];
          snapshot.forEach((doc) => {
            const data = doc.data();
            docs.push({ 
              id: doc.id, 
              ...data,
              // Convert Firestore Timestamp to ISO string if it exists
              uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            } as DocumentRecord);
          });
          setDocuments(docs);
        }, (error) => {
          // If we encounter a permission error while logged out, ignore it as it's a known race condition
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'documents');
          }
        });
      } else {
        setDocuments([]);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDocs) unsubscribeDocs();
    };
  }, [setUser, setDocuments]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-800">Loading...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/correspondance" replace />} />
          <Route path="correspondance" element={<OfficialCorrespondance />} />
          <Route 
            path="branches" 
            element={
              <GenericPage 
                title="Branch Offices" 
                description="Manage and view information related to all Dhenkanal RS SO branch offices." 
              />
            } 
          />
          <Route 
            path="customers" 
            element={
              <GenericPage 
                title="Our Customers" 
                description="View customer details, interaction history, and related metrics." 
              />
            } 
          />
          <Route 
            path="agents" 
            element={
              <GenericPage 
                title="Our Agents" 
                description="Agent directory, performance metrics, and contact information." 
              />
            } 
          />
          <Route 
            path="others" 
            element={
              <GenericPage 
                title="Others" 
                description="Miscellaneous documents, links, and operational information." 
              />
            } 
          />
          <Route path="admin" element={<AdminPortal />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
