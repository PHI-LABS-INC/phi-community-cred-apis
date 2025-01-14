interface Parameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
}

interface ParametersTableProps {
  parameters: Parameter[];
}

export default function ParametersTable({ parameters }: ParametersTableProps) {
  return (
    <div className="mb-8">
      <h3 className="text-xl font-bold mb-4 text-slate-900">Parameters</h3>
      <div className="overflow-scroll rounded-lg border border-slate-200 shadow-sm">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50">
              <th className="text-left p-4 font-medium text-slate-700">Name</th>
              <th className="text-left p-4 font-medium text-slate-700">Type</th>
              <th className="text-left p-4 font-medium text-slate-700">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {parameters.map((param) => (
              <tr
                key={param.name}
                className="border-t border-slate-200 text-slate-600"
              >
                <td className="p-4 font-mono text-sm">{param.name}</td>
                <td className="p-4 text-slate-600">{param.type}</td>
                <td className="p-4 text-slate-600">{param.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
