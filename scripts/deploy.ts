import { ethers, run }from "hardhat";
import fs from 'fs'
import path from 'path';
import { hexlify } from "ethers";

const coder = ethers.AbiCoder.defaultAbiCoder();

const filePath = path.join(__dirname, 'inputs.json');
const jsonrootLlama = JSON.parse(fs.readFileSync(filePath, 'utf8'));
async function readRelativeStrategies(jsonPath: any) {
  // Read and parse the JSON file
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Assuming that the structure of your JSON is such that you can directly index into it:
  const rawStrategyConfigs = jsonInput.initialStrategies;

  const strategyConfigs = rawStrategyConfigs.map((rawStrategy: any) => ({
    approvalPeriod: rawStrategy.approvalPeriod,
    queuingPeriod: rawStrategy.queuingPeriod,
    expirationPeriod: rawStrategy.expirationPeriod,
    minApprovalPct: rawStrategy.minApprovalPct,
    minDisapprovalPct: rawStrategy.minDisapprovalPct,
    isFixedLengthApprovalPeriod: rawStrategy.isFixedLengthApprovalPeriod,
    approvalRole: rawStrategy.approvalRole,
    disapprovalRole: rawStrategy.disapprovalRole,
    forceApprovalRoles: rawStrategy.forceApprovalRoles,
    forceDisapprovalRoles: rawStrategy.forceDisapprovalRoles
  }));
  const encoded = strategyConfigs.map((config: any) => coder.encode([
    'uint64', 'uint8', 'uint8', 'uint64', 'uint8[]', 'uint8[]', 'bool', 'uint16', 'uint16', 'uint64'
], [
    config.approvalPeriod, config.approvalRole, config.disapprovalRole,
    config.expirationPeriod, config.forceApprovalRoles, config.forceDisapprovalRoles,
    config.isFixedLengthApprovalPeriod, config.minApprovalPct, config.minDisapprovalPct,
    config.queuingPeriod
]));

  return encoded;
}

async function readAccounts(jsonPath: string) {
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const rawAccountsConfigs = jsonInput.initialAccounts;

  const accountConfigs = rawAccountsConfigs.map((rawAccount: any) => coder.encode([
    'string'
  ],[
  rawAccount.name
  ]));

  return accountConfigs;
}


type RoleHolderData = {
  role: string;
  policyholder: string;
  quantity: number;
  expiration: number;
};

async function readRoleHolders(jsonPath: string): Promise<RoleHolderData[]> {
   // Read and parse the JSON file
   const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
   const rawRoleHolders: any[] = jsonInput.initialRoleHolders;

   const encodedRoleHolders: any = rawRoleHolders.map((rawRoleHolder: any) => {
       // ABI encode the data
       return coder.encode(
           ["string", "uint64", "address", "uint128", "uint8"], 
           [
              rawRoleHolder.comment,
               rawRoleHolder.expiration,
               rawRoleHolder.policyholder,
               rawRoleHolder.quantity,
               rawRoleHolder.role
           ]
       );
   });

   return encodedRoleHolders;
}



async function readRoleDescriptions(jsonPath: string): Promise<string[]> {
  // Read and parse the JSON file
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  const descriptions: string[] = jsonInput.initialRoleDescriptions;

  // Check the length of each description and convert to bytes32
  const bytes32Descriptions: string[] = descriptions.map(description => {
      if (Buffer.from(description).length > 32) {
          throw new Error("Role description is too long");
      }
      
      // Convert string to bytes32 and then to hex string
      return hexlify(ethers.encodeBytes32String(description));
  });

  return bytes32Descriptions;
}

type RolePermissionData = {
  role: string;
  permissionId: string;
  hasPermission: boolean;
};

async function readRolePermissions(jsonPath: string): Promise<{role: number, permissionId: string, hasPermission: boolean}[]> {
  // Read and parse the JSON file
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Assuming that the structure of your JSON is such that you can directly index into it:
  const rawRolePermissions: any[] = jsonInput.initialRolePermissions;

  const rolePermissions: any = rawRolePermissions.map((rawRolePermission: any) => {
      return {
          role: rawRolePermission.role,
          permissionId: hexlify(rawRolePermission.permissionId),
          hasPermission: true // Given your function always sets this as true
      };
  });

  return rolePermissions;
}

async function main() {
  const coreLogic = await ethers.deployContract("LlamaCore");
  await coreLogic.waitForDeployment();

  const relativeQuorumLogic = await ethers.deployContract("LlamaRelativeQuorum");
  await relativeQuorumLogic.waitForDeployment();


  const absolutePeerReviewLogic = await ethers.deployContract("LlamaAbsolutePeerReview");
  await absolutePeerReviewLogic.waitForDeployment();


  const absoluteQuorumLogic = await ethers.deployContract("LlamaAbsoluteQuorum");
  await absoluteQuorumLogic.waitForDeployment();


  const accountLogic = await ethers.deployContract("LlamaAccount");
  await accountLogic.waitForDeployment();


  const policyLogic = await ethers.deployContract("LlamaPolicy");
  await policyLogic.waitForDeployment();

  const policyMetadata = await ethers.deployContract("LlamaPolicyMetadata");
  await policyMetadata.waitForDeployment();

  let factory
  try {
    factory = await ethers.deployContract("LlamaFactory", [coreLogic.target, relativeQuorumLogic.target, accountLogic.target, policyLogic.target, policyMetadata.target, jsonrootLlama.rootLlamaName, await readRelativeStrategies(filePath), await readAccounts(filePath), await readRoleDescriptions(filePath), await readRoleHolders(filePath), await readRolePermissions(filePath)]);
  } catch (err) {
    console.log(err)
  }

  const deployContract = {
    coreLogic: coreLogic.target,
    absolutePeerReviewLogic: absolutePeerReviewLogic.target,
    accountLogic: accountLogic.target,
    policyLogic: policyLogic.target,
    relativeQuorumLogic: relativeQuorumLogic.target,
    absoluteQuorumLogic: absoluteQuorumLogic.target,
    policyMetadata:policyMetadata.target,
    factory: factory?.target
  }

  console.log(deployContract);

  await verifyContract(coreLogic.target);
  await verifyContract(relativeQuorumLogic.target);
  await verifyContract(absolutePeerReviewLogic.target);
  await verifyContract(absoluteQuorumLogic.target);
  await verifyContract(accountLogic.target);
  await verifyContract(policyLogic.target);
  await verifyContract(policyMetadata.target);
  await verifyContract(factory?.target, [coreLogic.target, relativeQuorumLogic.target, accountLogic.target, policyLogic.target, policyMetadata.target, jsonrootLlama.rootLlamaName, await readRelativeStrategies(filePath), await readAccounts(filePath), await readRoleDescriptions(filePath), await readRoleHolders(filePath), await readRolePermissions(filePath)]);
}


//VERIFCATION
async function verifyContract(contract: any, ...constructorArguments: any) {
  console.log(`Verifying ${contract.contractName}`);
  await run("verify:verify", {
    address: contract.address,
    constructorArguments: constructorArguments,
  });
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});