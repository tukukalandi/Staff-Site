export function GenericPage({ title, description }: { title: string, description: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center w-full max-w-7xl mx-auto min-h-[60vh]">
      <div className="bg-white p-12 rounded-3xl border border-gray-200 shadow-sm max-w-2xl w-full">
        <h1 className="text-3xl md:text-4xl font-serif font-semibold text-[#E31837] mb-4">{title}</h1>
        <p className="text-lg text-gray-600">
          {description}
        </p>
        <div className="mt-8 pt-8 border-t border-gray-100 italic text-gray-400 text-sm">
          Section under continuous development.
        </div>
      </div>
    </div>
  );
}
