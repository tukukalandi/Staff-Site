import { FileText, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { useAppStore } from "../store";

export function OfficialCorrespondance() {
  const documents = useAppStore((state) => state.documents);

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-2xl md:text-3xl font-serif font-semibold text-[#E31837] mb-1">Official Correspondance</h2>
          <p className="text-gray-500">Manage and track all official documents and circulars uploaded via Admin Portal.</p>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-2xl md:rounded-3xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {documents.length > 0 ? (
          <div className="overflow-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Letter No.</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Related Branch</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Date of Receipt</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500">Description</th>
                  <th scope="col" className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-gray-500 text-center">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-[#E31837] whitespace-nowrap">
                      {doc.letterNo}
                      {doc.fileName && (
                        <div className="text-[10px] text-gray-500 mt-1 line-clamp-1">{doc.fileName}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-[#E31837]">
                        {doc.branch}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {format(new Date(doc.dateOfReceipt), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 max-w-xs truncate">
                      {doc.description}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <a 
                        href={doc.fileUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-[#E31837] hover:underline font-bold text-sm inline-flex items-center gap-1 justify-center"
                        onClick={(e) => {
                          if (doc.fileUrl === '#') {
                            e.preventDefault();
                            alert('This is a mock document. Google Drive integration would be needed for a real file.');
                          }
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-sm font-bold text-gray-900">No documents found</h3>
            <p className="mt-2 text-sm text-gray-500">Get started by uploading a new document via the Admin Portal.</p>
          </div>
        )}
      </div>
    </div>
  );
}
