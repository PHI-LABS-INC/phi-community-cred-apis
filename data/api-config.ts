export const endpoints = [
  {
    method: "GET",
    path: "/api/cyber/cyber-january-ransactor",
    id: "verifytx",
    description:
      "Verifies if an Ethereum address has transactions in January 2025 on cyber mainnet and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/freysa-reflections-holder/",
    id: "verifyfreysanft",
    description:
      "Verifies if an Ethereum address owns an NFT from the Freysa Reflections 2049 collection on base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/clanker-coin",
    id: "verifyclanker",
    description:
      "Verifies if an Ethereum address has launched or purchased a Clanker coin and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/creator-bid-ans",
    id: "verifyans",
    description:
      "Verifies if an Ethereum address owns an ANS (Arweave Name Service) domain from creator.bid and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/morpho-loan",
    id: "verifymorpholoan",
    description:
      "Verifies if an Ethereum address has an active USDC loan on Morpho (Base) and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/january-transactor",
    id: "verifybasetx",
    description:
      "Verifies if an Ethereum address has transactions in January 2025 on Base and returns eligibility status with cryptographic signature",
  },
];

export const parameters = [
  {
    name: "address",
    type: "string",
    required: true,
    description: "Ethereum address to verify",
  },
];
