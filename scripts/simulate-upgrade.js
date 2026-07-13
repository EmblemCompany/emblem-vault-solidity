// Careful, read-only-to-mainnet simulation of the VaultHandlerV8Upgradable upgrade.
// Runs entirely on a Hardhat mainnet FORK — no real transaction is ever sent to
// mainnet, and no private key is used (we impersonate the ProxyAdmin owner).
//
// Run with:
//   HARDHAT_FORK=1 npx hardhat run scripts/simulate-upgrade.js
//
// It verifies:
//   1. storage is preserved across the upgrade (spot-checked public getters + raw slots)
//   2. the new functions exist on the upgraded proxy
//   3. executeCallbacks (which vault contracts call back into) is still present
const hre = require('hardhat');
const { ethers } = hre;

const PROXY = '0x23859b51117dbFBcdEf5b757028B18d7759a4460'; // handler_upgradable
const PROXY_ADMIN = '0xe276578235FB10F4d02a070bE48A1503a98fd256'; // from .openzeppelin/mainnet.json
// EIP-1967 slots
const IMPL_SLOT = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const ADMIN_SLOT = '0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103';

function label(ok) { return ok ? '✅ PASS' : '❌ FAIL'; }

async function readSlot(addr, slot) {
  return ethers.provider.getStorageAt(addr, slot);
}

async function main() {
  const net = await ethers.provider.getNetwork();
  const block = await ethers.provider.getBlockNumber();
  console.log(`Fork: chainId=${net.chainId} block=${block}`);
  if (net.chainId !== 1 && net.chainId !== 1337) {
    console.log('WARNING: this does not look like a mainnet fork. Aborting to be safe.');
    return;
  }

  // Sanity: confirm the EIP-1967 admin slot on the proxy points at PROXY_ADMIN.
  const adminSlotVal = '0x' + (await readSlot(PROXY, ADMIN_SLOT)).slice(-40);
  console.log(`Proxy admin (from slot): ${adminSlotVal}`);
  console.log(`  ${label(adminSlotVal.toLowerCase() === PROXY_ADMIN.toLowerCase())} admin slot matches manifest ProxyAdmin`);

  const implBefore = '0x' + (await readSlot(PROXY, IMPL_SLOT)).slice(-40);
  console.log(`Implementation BEFORE: ${implBefore}`);

  // ---- Snapshot pre-upgrade state via the current ABI + raw slots ----
  const handlerBefore = await ethers.getContractAt('VaultHandlerV8Upgradable', PROXY);
  const before = {};
  try { before.recipient = await handlerBefore.recipientAddress(); } catch (e) { before.recipient = 'REVERT'; }
  try { before.metadataBaseUri = await handlerBefore.metadataBaseUri(); } catch (e) { before.metadataBaseUri = 'REVERT'; }
  // Raw storage spot-checks (slots 113-118 region + callback slots 109-111)
  const rawSlots = [107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118];
  before.raw = {};
  for (const s of rawSlots) before.raw[s] = await readSlot(PROXY, ethers.utils.hexZeroPad(ethers.utils.hexlify(s), 32));
  console.log('Snapshotted pre-upgrade storage.');

  // ---- Find the ProxyAdmin owner and impersonate it (no key needed) ----
  const proxyAdmin = await ethers.getContractAt(
    ['function owner() view returns (address)', 'function upgrade(address proxy, address impl) public', 'function getProxyImplementation(address) view returns (address)'],
    PROXY_ADMIN
  );
  const owner = await proxyAdmin.owner();
  console.log(`ProxyAdmin owner: ${owner}`);

  await hre.network.provider.request({ method: 'hardhat_impersonateAccount', params: [owner] });
  await hre.network.provider.request({ method: 'hardhat_setBalance', params: [owner, '0x3635C9ADC5DEA00000'] }); // 1000 ETH
  const ownerSigner = await ethers.getSigner(owner);

  // ---- Deploy the NEW implementation on the fork ----
  const Factory = await ethers.getContractFactory('VaultHandlerV8Upgradable');
  const newImpl = await Factory.deploy();
  await newImpl.deployed();
  console.log(`New implementation deployed on fork: ${newImpl.address}`);

  // ---- Perform the upgrade through the real ProxyAdmin ----
  const tx = await proxyAdmin.connect(ownerSigner).upgrade(PROXY, newImpl.address);
  await tx.wait();
  const implAfter = '0x' + (await readSlot(PROXY, IMPL_SLOT)).slice(-40);
  console.log(`Implementation AFTER:  ${implAfter}`);
  console.log(`  ${label(implAfter.toLowerCase() === newImpl.address.toLowerCase())} proxy now points at the new implementation`);

  // ---- Verify storage preserved ----
  const handlerAfter = await ethers.getContractAt('VaultHandlerV8Upgradable', PROXY);
  const after = {};
  try { after.recipient = await handlerAfter.recipientAddress(); } catch (e) { after.recipient = 'REVERT'; }
  try { after.metadataBaseUri = await handlerAfter.metadataBaseUri(); } catch (e) { after.metadataBaseUri = 'REVERT'; }

  console.log('\n--- Storage preservation ---');
  console.log(`  recipientAddress: ${before.recipient} -> ${after.recipient}  ${label(before.recipient === after.recipient)}`);
  console.log(`  metadataBaseUri : "${before.metadataBaseUri}" -> "${after.metadataBaseUri}"  ${label(before.metadataBaseUri === after.metadataBaseUri)}`);
  let rawOk = true;
  for (const s of rawSlots) {
    const now = await readSlot(PROXY, ethers.utils.hexZeroPad(ethers.utils.hexlify(s), 32));
    if (now !== before.raw[s]) { rawOk = false; console.log(`  slot ${s} CHANGED: ${before.raw[s]} -> ${now}`); }
  }
  console.log(`  raw slots 107-118 unchanged: ${label(rawOk)}`);

  // ---- Verify new functions exist on the upgraded proxy ----
  console.log('\n--- Function selectors in upgraded ABI ---');
  const iface = handlerAfter.interface;
  // Paid single claim is claimWithSignedPrice; the old free claim(address,uint256)
  // selector is preserved but reverts with guidance.
  const expectPresent = ['claimWithSignedPrice', 'batchClaimWithSignedPrice', 'claim(address,uint256)', 'executeCallbacks'];
  const expectAbsent = ['batchClaim']; // free batch removed
  for (const fn of expectPresent) {
    let present = false;
    try { iface.getFunction(fn); present = true; } catch (e) {}
    console.log(`  ${label(present)} ${fn} present`);
  }
  for (const fn of expectAbsent) {
    let present = false;
    try { iface.getFunction(fn); present = true; } catch (e) {}
    console.log(`  ${label(!present)} ${fn} removed`);
  }

  // The retired free claim must revert with guidance (selector alive, callable, reverts).
  try {
    await handlerAfter.callStatic['claim(address,uint256)'](ethers.constants.AddressZero, 0);
    console.log('  ❌ FAIL old claim(address,uint256) did NOT revert');
  } catch (e) {
    const guided = /Use claimWithSignedPrice/.test(e.message);
    console.log(`  ${label(guided)} old claim(address,uint256) reverts with guidance`);
  }

  // ---- Confirm executeCallbacks is actually callable (guarded, so expect a controlled revert, NOT unrecognized selector) ----
  try {
    // Calling from a non-registered address should revert with the registration guard,
    // proving the function EXISTS (an absent function would fail differently).
    await handlerAfter.callStatic.executeCallbacks(ethers.constants.AddressZero, ethers.constants.AddressZero, 0, 0);
    console.log('  ✅ executeCallbacks callable (did not revert unexpectedly)');
  } catch (e) {
    const guarded = /not registered|Contract is not registered/i.test(e.message);
    console.log(`  ${label(guarded)} executeCallbacks present & guarded (revert: ${guarded ? 'registration guard' : e.message.slice(0, 80)})`);
  }

  console.log('\nSimulation complete. No mainnet transaction was sent.');
}

main().catch((e) => { console.error(e); process.exit(1); });
