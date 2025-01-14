export default function ResponseExample() {
  const exampleResponse = {
    mint_eligibility: true,
    data: "relevant-data",
    signature:
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  };

  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-4 text-slate-900">Response</h3>
      <div className="bg-slate-50 rounded-lg p-6 border border-slate-200 shadow-sm overflow-auto">
        <pre className="text-sm text-slate-800 whitespace-pre">
          <code>{JSON.stringify(exampleResponse, null, 2)}</code>
        </pre>
      </div>
    </div>
  );
}
