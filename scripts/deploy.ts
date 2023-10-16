import { ethers, run }from "hardhat";
import fs from 'fs'
import path from 'path';


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

  //   const encoded = strategyConfigs.map((config: any) => ethers.AbiCoder.([
  //     'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bool', 'bytes32', 'bytes32', 'address[]', 'address[]'
  // ], [
  //     config.approvalPeriod, config.queuingPeriod, config.expirationPeriod, 
  //     config.minApprovalPct, config.minDisapprovalPct, config.isFixedLengthApprovalPeriod, 
  //     config.approvalRole, config.disapprovalRole, config.forceApprovalRoles, config.forceDisapprovalRoles
  // ]));

  return strategyConfigs;
}


async function readAccounts(jsonPath: string) {
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const rawAccountsConfigs = jsonInput.initialAccounts;

  const accountConfigs = rawAccountsConfigs.map((rawAccount: any) => ({
    name: rawAccount.name
  }));

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

  const roleHolders = rawRoleHolders.map((rawRoleHolder: any) => ({
    role: rawRoleHolder.role,
    policyholder: rawRoleHolder.policyholder,
    quantity: rawRoleHolder.quantity,
    expiration: rawRoleHolder.expiration,
  }));

  return roleHolders;
}



async function readRoleDescriptions(jsonPath: string) {
  // Read and parse the JSON file
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Assuming that the structure of your JSON is such that you can directly index into it:
  const descriptions: string[] = jsonInput.initialRoleDescriptions;

  // Check the length of each description
  descriptions.forEach(description => {
    if (Buffer.from(description).length > 32) {
      throw new Error("Role description is too long");
    }
  });

  // Return the descriptions array
  return descriptions;
}


type RolePermissionData = {
  role: string;
  permissionId: string;
  hasPermission: boolean;
};

async function readRolePermissions(jsonPath: string): Promise<RolePermissionData[]> {
  // Read and parse the JSON file
  const jsonInput = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  // Assuming that the structure of your JSON is such that you can directly index into it:
  const rawRolePermissions: any[] = jsonInput.initialRolePermissions;

  const rolePermissions = rawRolePermissions.map((rawRolePermission: any) => ({
    role: rawRolePermission.role,
    permissionId: rawRolePermission.permissionId,
    hasPermission: true // Given your function always set this as true
  }));

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
//  const lock = await ethers.deployContract("Lock", [unlockTime], {
//     value: lockedAmount,
//   });

//   await lock.waitForDeployment();