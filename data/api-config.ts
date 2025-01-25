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
  {
    method: "GET",
    path: "/api/base/cat-town-game",
    id: "verifycat",
    description:
      "Verifies if an Ethereum address holds at least 1000 Kibble tokens and owns at least one Cat Town NFT (Founder Profile Picture Collection) and returns eligibility status with cryptographic signature",
  },
  {
    method: "GET",
    path: "/api/base/rodeo-content-verifier",
    id: "verifyrodeo",
    description:
      "Verifies if an Ethereum address has content in the Rodeo and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/btc-loan-taker",
    id: "verifybtcloan",
    description:
      "Verifies if an Ethereum address has an active BTC loan on Coinbase and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/opensea-nft-holder",
    id: "verifyopensea",
    description:
      "Verifies if an Ethereum address has NFTs on OpenSea and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/blackbird-restaurant",
    id: "verifyblackbird",
    description:
      "Verifies if an Ethereum address has an NFT from the Blackbird Restaurant collection on Base and returns eligibility status",
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


