// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;
import { Base58 } from "./Base58.sol";

contract EthBtcLinker {
  // mapping(string => string) private _btcToEth;
  // mapping(string => string) private _ethToBtc;
  // mapping(uint256 => bool) private _usedNonces;

  // function mapAddress(
  //   string calldata btcAddress,
  //   string calldata ethAddress,
  //   uint256 nonce,
  //   bytes calldata signature
  // ) public {
  //   require(!_usedNonces[nonce], "Nonce already used");
  //   _usedNonces[nonce] = true;

  //   // Verify the signature
  //   bytes32 message = prefixed(keccak256(abi.encodePacked(btcAddress, ethAddress, nonce)));
  //   address signer = verifyBitcoinSignature(signature, message);
  //   require(signer == address(bytes20(Base58.decode(btcAddress))), "Invalid signature");

  //   _btcToEth[btcAddress] = ethAddress;
  //   _ethToBtc[ethAddress] = btcAddress;
  // }

  // function getETHAddress(string calldata btcAddress) public view returns (string memory) {
  //   string memory ethAddress = _btcToEth[btcAddress];
  //   require(bytes(ethAddress).length > 0, "Address not registered");
  //   return ethAddress;
  // }

  // function getBTCAddress(string calldata ethAddress) public view returns (string memory) {
  //   string memory btcAddress = _ethToBtc[ethAddress];
  //   require(bytes(btcAddress).length > 0, "Address not registered");
  //   return btcAddress;
  // }

  // function prefixed(bytes32 hash) internal pure returns (bytes32) {
  //   return keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
  // }

  // function verifyBitcoinSignature(bytes memory sig, bytes32 message)
  //   internal
  //   pure
  //   returns (address)
  // {
  //   require(sig.length == 65, "Invalid signature");

  //   bytes32 r;
  //   bytes32 s;
  //   uint8 v;

  //   assembly {
  //     r := mload(add(sig, 32))
  //     s := mload(add(sig, 64))
  //     v := byte(0, mload(add(sig, 96)))
  //   }

  //   // If the signature is in the wrong "half" of the curve, adjust the "v" value
  //   if (uint256(s) > uint256(type(uint256).max) / 2) {
  //     v = uint8(27) - v;
  //   }

  //   // Recover the signing address from the signature
  //   address signer = ecrecover(message, v, r, s);

  //   return signer;
  // }
}
