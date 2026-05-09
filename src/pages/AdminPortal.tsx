/// <reference types="vite/client" />
import React, { useState } from "react";
import { Upload, Save, File, Trash2, ExternalLink } from "lucide-react";
import { useAppStore } from "../store";
import { db, auth, storage, OperationType, handleFirestoreError } from "../firebase";
import { collection, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { format } from "date-fns";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const BRANCHES = [
  "Dhenkanal Main",
  "Angul",
  "Talcher",
  "Kamakhya Nagar",
  "Bhuban"
];

export function AdminPortal() {
  const user = useAppStore((state) => state.user);
  const documents = useAppStore((state) => state.documents);
  
  const [formData, setFormData] = useState({
    letterNo: "",
    branch: BRANCHES[0],
    dateOfReceipt: new Date().toISOString().split('T')[0],
    description: "",
  });
  
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, "documents", id));
      setSuccessMessage("Document deleted successfully!");
      // Automatically clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (error) {
      console.error("Error deleting document:", error);
      handleFirestoreError(error, OperationType.DELETE, "documents");
      setErrorMessage("Failed to delete document.");
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMessage("You must be logged in to upload documents.");
      return;
    }
    
    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      let fileUrl = "#";
      let fileName = file ? file.name : "No file attached";
      let fileBase64 = "";
      let mimeType = "";

      if (file) {
        // Read file as Base64 format for Apps Script
        fileBase64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // extract base64 data
          };
          reader.onerror = reject;
        });
        mimeType = file.type;
      }

      const docData = {
        letterNo: formData.letterNo,
        branch: formData.branch,
        dateOfReceipt: formData.dateOfReceipt,
        description: formData.description,
        fileName,
        fileUrl, 
        uploadedAt: serverTimestamp(),
        userId: user.uid,
      };

      const webhookUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEBHOOK_URL;
      
      // Upload directly to Google Drive via Apps Script Webhook
      if (webhookUrl && file && fileBase64) {
        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            // DO NOT use no-cors if we want to read the response!
            // We use text/plain to bypass the OPTIONS preflight request which Apps Script struggles with.
            headers: {
              'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify({
              letterNo: docData.letterNo,
              branch: docData.branch,
              dateOfReceipt: docData.dateOfReceipt,
              description: docData.description,
              fileName: docData.fileName,
              fileBase64: fileBase64,
              mimeType: mimeType,
              uploadedAt: new Date().toISOString(),
              userId: docData.userId
            })
          });
          
          const responseText = await response.text();
          let result;
          try {
            result = JSON.parse(responseText);
          } catch (e) {
            if (responseText.includes("Success") || responseText.includes("success")) {
              console.warn("Webhook returned success but did not return a valid JSON object with a file url.", responseText);
              // Since it succeeded but no URL was given, we will just proceed with the default "#" url.
              // Note: To get the Google Drive link, the Apps script must return { "status": "success", "fileUrl": "..." }
            } else {
              throw new Error("Invalid response from webhook: " + responseText);
            }
          }

          if (result) {
            if (result.status === 'success' && result.fileUrl) {
              docData.fileUrl = result.fileUrl; // Use the Google Drive URL returned by Apps Script
            } else {
              throw new Error(result.message || "Unknown error from Apps Script: " + responseText);
            }
          }
        } catch (webhookError) {
          console.error("Failed to upload to Google Drive:", webhookError);
          throw new Error(`Failed to upload document to Google Drive: ${webhookError instanceof Error ? webhookError.message : String(webhookError)}`);
        }
      } else if (!webhookUrl) {
         throw new Error("Google Sheets Webhook URL is not configured. Please add VITE_GOOGLE_SHEETS_WEBHOOK_URL to your environment variables.");
      }

      // Save to Firestore Database with the Google Drive link
      await addDoc(collection(db, 'documents'), docData);
      
      setIsSubmitting(false);
      setSuccessMessage("Document uploaded directly to Google Drive and saved successfully!");
      
      // Reset form
      setFormData({
        letterNo: "",
        branch: BRANCHES[0],
        dateOfReceipt: new Date().toISOString().split('T')[0],
        description: "",
      });
      setFile(null);
    } catch (error) {
      setIsSubmitting(false);
      setErrorMessage(error instanceof Error ? error.message : "Failed to upload document. See console for details.");
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-serif font-semibold text-[#E31837] mb-1">Admin Portal</h1>
        <p className="text-gray-500">
          Upload official documents to the portal.
        </p>
      </div>

      {!user && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
          <p className="text-red-700 text-sm font-medium">
            You are currently viewing the portal in read-only mode. Please sign in using the button in the top right to upload documents.
          </p>
        </div>
      )}

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl md:rounded-3xl overflow-hidden mb-8">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Upload New Correspondence</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label htmlFor="letterNo" className="block text-sm font-bold text-gray-700">Letter No.</label>
              <input
                type="text"
                id="letterNo"
                name="letterNo"
                required
                value={formData.letterNo}
                onChange={handleChange}
                className="w-full flex h-11 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-colors shadow-sm"
                placeholder="e.g. DKL-2023-A-01"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="branch" className="block text-sm font-bold text-gray-700">Related to which Branch</label>
              <select
                id="branch"
                name="branch"
                value={formData.branch}
                onChange={handleChange}
                className="w-full flex h-11 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-colors shadow-sm"
              >
                {BRANCHES.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="dateOfReceipt" className="block text-sm font-bold text-gray-700">Date of Receipt</label>
            <input
              type="date"
              id="dateOfReceipt"
              name="dateOfReceipt"
              required
              value={formData.dateOfReceipt}
              onChange={handleChange}
              className="w-full md:w-1/2 flex h-11 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-colors shadow-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="description" className="block text-sm font-bold text-gray-700">Description</label>
            <textarea
              id="description"
              name="description"
              required
              rows={4}
              value={formData.description}
              onChange={handleChange}
              className="w-full flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:border-transparent transition-colors resize-none shadow-sm"
              placeholder="Provide a brief description of the document..."
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Document Upload</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-xl hover:bg-gray-50 transition-colors">
              <div className="space-y-1 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="flex items-center text-sm text-gray-600 justify-center mt-4">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white rounded-md font-bold text-[#E31837] hover:underline focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[#E31837]"
                  >
                    <span>Upload a file</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} required />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">PNG, JPG, PDF up to 10MB</p>
                {file && (
                  <div className="mt-4 flex items-center justify-center text-sm font-medium text-[#E31837] bg-red-50 py-2 px-3 rounded-lg border border-red-100">
                    <File className="w-4 h-4 mr-2" />
                    {file.name}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-6 flex flex-col items-center gap-4 border-t border-gray-200">
            {successMessage && (
              <p className="w-full text-center text-sm font-medium text-[#E31837] bg-red-50 px-4 py-2 rounded-lg border border-red-100">{successMessage}</p>
            )}
            {errorMessage && (
              <p className="w-full text-center text-sm font-medium text-red-600 bg-red-50 px-4 py-2 rounded-lg border border-red-200">{errorMessage}</p>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting || !file}
              className="w-full md:w-auto inline-flex items-center justify-center rounded-lg bg-[#E31837] px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-[#E31837] focus:ring-offset-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ml-auto"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Document
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white shadow-sm border border-gray-200 rounded-2xl md:rounded-3xl overflow-hidden mb-8">
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <h3 className="text-lg font-bold text-gray-900">Manage Documents</h3>
        </div>
        <div className="p-0">
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Letter No.</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Branch</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date</th>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {doc.letterNo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {doc.branch}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {format(new Date(doc.dateOfReceipt), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 text-sm text-center">
                        <div className="flex items-center justify-center gap-3">
                          <a 
                            href={doc.fileUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 transition-colors inline-flex items-center"
                            title="View Document"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id || !user}
                            className="text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                            title="Delete Document"
                          >
                            {deletingId === doc.id ? (
                              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-500">
              No documents uploaded yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
