import Image from 'next/image';

export default function Logo() {
  return (
    <div className="flex items-center gap-4 mb-8">
      <Image
        src="/logo.svg"
        alt="PHI Cred APIs Logo"
        width={57}
        height={32}
        className="h-8 w-auto"
      />
    </div>
  );
}
