import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  solidity:{
    version:"0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  } ,
  networks:{
    buildbear: {
      url: "https://rpc.dev.buildbear.io/arjun"
}
  },
  etherscan: {
    apiKey: {
      buildbear: "verifyContract",
    },
    customChains: [
      {
        network: "buildbear",
        chainId: 1,
        urls: {
          apiURL: "https://rpc.dev.buildbear.io/verify/etherscan/arjun",
          browserURL: "https://explorer.dev.buildbear.io/arjun",
        },
      },
    ],
  },
  paths: {
    sources: "./src",
  },
};

export default config;
