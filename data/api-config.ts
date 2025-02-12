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
  {
    method: "GET",
    path: "/api/base/gigabrain-member",
    id: "verifygigabrain",
    description:
      "Verifies if an Ethereum address holds either a GigaBrain Pass NFT or at least 1M GigaBrain tokens and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/ethos-network-user",
    id: "verifyethos",
    description:
      "Verifies if an Ethereum address has an Ethos Network profile and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/super-usdc-holders",
    id: "verifysuperusdc",
    description:
      "Verifies if an Ethereum address holds at least 100,000 USDC on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/timeswap-time-traveller",
    id: "verifytimeswap",
    description:
      "Verifies if an Ethereum address holds any Timeswap Pool Position NFTs and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/bento-holder",
    id: "verifybento",
    description:
      "Verifies if an Ethereum address holds any Bento tokens and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/flaunch",
    id: "verifyflaunch",
    description:
      "Verifies if an Ethereum address has interacted with the Flaunch contract and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/infected-fun",
    id: "verifyinfectedfun",
    description:
      "Verifies if an Ethereum address is registered on Infected.fun and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/spark-fi",
    id: "verifysparkfi",
    description:
      "Verifies if an Ethereum address has borrowed at least $10 worth of USDS on Spark.fi and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/base/base-transactions-100",
    id: "verifybasetx100",
    description:
      "Verifies if an Ethereum address has at least 100 transactions on Base and returns eligibility status",
  },
  {
    method: "GET",
    path: "/api/ethereum/nounce-dao-voters",
    id: "verifynouncedao",
    description:
      "Verifies if an Ethereum address has voted in the Nounce DAO and returns eligibility status on ethereum mainnet",
  },
  {
    method: "GET",
    path: "/api/ethereum/doodle-holder",
    id: "verifydoodle",
    description:
      "Verifies if an Ethereum address has purchased a Doodle in 2021 and returns eligibility status on ethereum mainnet",
  },
  {
    method: "GET",
    path: "/api/base/b3-staker",
    id: "verifyb3staker",
    description:
      "Verifies if an Ethereum address holds at least 1000 B3 tokens and returns eligibility status on base",
  },
  {
    method: "GET",
    path: "/api/base/basement-player",
    id: "verifybasementplayer",
    description:
      "Verifies if an Ethereum address has played at least one game on Basement.fun and returns eligibility status on base",
  },
  {
    method: "GET",
    path: "/api/base/base-gas-user",
    id: "verifybasegasuser",
    description:
      "Verifies if an Ethereum address has spent at least 0.1 ETH on Base and returns eligibility status",
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
