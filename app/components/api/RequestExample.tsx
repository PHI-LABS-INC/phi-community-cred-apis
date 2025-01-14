import { Clipboard, CheckCircle } from "lucide-react";
import { useState } from "react";

interface RequestExampleProps {
  path: string;
}

export default function RequestExample({ path }: RequestExampleProps) {
  const exampleAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const baseUrl = window.location.origin;
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const generateCurlCommand = (includeAddress: boolean) =>
    `${baseUrl}${path}${includeAddress ? `?address=${exampleAddress}` : ""}`;

  const copyToClipboard = (command: string, index: number) => {
    navigator.clipboard.writeText(command).then(
      () => {
        setCopiedIndex(index);
        setTimeout(() => {
          setCopiedIndex(null);
        }, 2000);
      },
      () => {
        setTimeout(() => setCopiedIndex(null), 2000);
      }
    );
  };

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-slate-900">Request URL</h3>
      </div>
      {[
        {
          title: "Link to test on browser",
          command: generateCurlCommand(true),
          onClick: (index: number) =>
            copyToClipboard(generateCurlCommand(true), index),
        },
        {
          title: (
            <>
              Link to use at{" "}
              <a
                target="_blank"
                href="https://base.terminal.phi.box/"
                className="text-blue-600 underline"
              >
                https://base.terminal.phi.box/
              </a>
            </>
          ),
          command: generateCurlCommand(false),
          onClick: (index: number) =>
            copyToClipboard(generateCurlCommand(false), index),
        },
      ].map(({ title, command, onClick }, index) => (
        <div className="mt-4" key={index}>
          <div className="flex justify-between items-center">
            <h4 className="text-md text-slate-900 mb-2">{title}</h4>
            <button
              onClick={() => onClick(index)}
              className="p-2 text-slate-500 hover:text-slate-700 rounded flex items-center gap-2"
              title="Copy to clipboard"
            >
              {copiedIndex === index ? (
                <CheckCircle size={20} />
              ) : (
                <Clipboard size={20} />
              )}
            </button>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 shadow-sm overflow-auto">
            <pre className="text-sm text-slate-800 break-words">
              <code>{command}</code>
            </pre>
          </div>
        </div>
      ))}
    </div>
  );
}
