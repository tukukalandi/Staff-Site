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

  if (!auth.currentUser) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4 text-gray-800">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="mb-6 flex justify-center">
             <div className="w-16 h-16 bg-[#E31837] rounded-xl flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
             </div>
          </div>
          <h1 className="text-2xl font-serif font-bold mb-4 text-[#E31837]">Dhenkanal RS SO</h1>
          <p className="text-gray-500 mb-8">Please sign in to access the Staff Management Portal.</p>
          <button 
            onClick={handleSignIn}
            className="w-full bg-[#E31837] text-white py-3 px-4 rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Sign in with Google
          </button>
          {signInError && (
            <p className="text-sm text-red-600 mt-4 font-medium bg-red-100 p-2 rounded-lg border border-red-200 break-words">
              {signInError}
            </p>
          )}
          <p className="text-xs text-[#E31837] mt-4 font-medium bg-red-50 p-2 rounded-lg text-left">
            <strong>Note:</strong> If sign-in fails or popup is blocked, please open the app in a new tab using the ↗ icon in the top right.<br/><br/>
            <strong>Vercel Deployment:</strong> If you are deploying this on Vercel, you must go to your Firebase Console ({`->`} Authentication {`->`} Settings {`->`} Authorized domains) and add your Vercel URL (e.g. <code>your-app.vercel.app</code>) to the list.
          </p>
        </div>
      </div>
    );
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
