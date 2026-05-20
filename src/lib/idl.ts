

export const IDL = {
  "version": "0.1.0",
  "name": "basedlaunch",
  "instructions": [
    {
      "name": "createToken",
      "accounts": [
        { "name": "payer", "isMut": true, "isSigner": true },
        { "name": "mint", "isMut": true, "isSigner": true },
        { "name": "mintAuthority", "isMut": false, "isSigner": false },
        { "name": "creatorTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenInfo", "isMut": true, "isSigner": false },
        { "name": "vestingVault", "isMut": true, "isSigner": false },
        { "name": "vestingAccount", "isMut": true, "isSigner": false },
        { "name": "feeWallet", "isMut": true, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false },
        { "name": "rent", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "name", "type": "string" },
        { "name": "symbol", "type": "string" },
        { "name": "decimals", "type": "u8" },
        { "name": "totalSupply", "type": "u64" },
        { "name": "platformFeeLamports", "type": "u64" },
        { "name": "hasVesting", "type": "bool" },
        { "name": "vestingCliffSeconds", "type": "i64" },
        { "name": "vestingDurationSeconds", "type": "i64" },
        { "name": "teamAllocationPercent", "type": "u8" }
      ]
    },
    {
      "name": "claimVested",
      "accounts": [
        { "name": "beneficiary", "isMut": true, "isSigner": true },
        { "name": "vestingAccount", "isMut": true, "isSigner": false },
        { "name": "vestingVault", "isMut": true, "isSigner": false },
        { "name": "beneficiaryTokenAccount", "isMut": true, "isSigner": false },
        { "name": "mint", "isMut": false, "isSigner": false },
        { "name": "systemProgram", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "associatedTokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "TokenInfo",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "creator", "type": "publicKey" },
          { "name": "mint", "type": "publicKey" },
          { "name": "name", "type": "string" },
          { "name": "symbol", "type": "string" },
          { "name": "decimals", "type": "u8" },
          { "name": "totalSupply", "type": "u64" },
          { "name": "hasVesting", "type": "bool" },
          { "name": "teamAllocationPercent", "type": "u8" },
          { "name": "createdAt", "type": "i64" },
          { "name": "isInitialized", "type": "bool" }
        ]
      }
    },
    {
      "name": "VestingAccount",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "beneficiary", "type": "publicKey" },
          { "name": "mint", "type": "publicKey" },
          { "name": "totalAmount", "type": "u64" },
          { "name": "releasedAmount", "type": "u64" },
          { "name": "startTime", "type": "i64" },
          { "name": "cliffTime", "type": "i64" },
          { "name": "endTime", "type": "i64" },
          { "name": "isInitialized", "type": "bool" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "InvalidName", "msg": "Invalid token name" },
    { "code": 6001, "name": "InvalidSymbol", "msg": "Invalid token symbol" },
    { "code": 6002, "name": "InvalidDecimals", "msg": "Invalid decimals" },
    { "code": 6003, "name": "InvalidSupply", "msg": "Invalid supply" },
    { "code": 6004, "name": "InvalidFee", "msg": "Invalid fee" },

    { "code": 6005, "name": "InvalidFeeWallet", "msg": "Invalid fee wallet" },
{ "code": 6006, "name": "InvalidTeamAllocation", "msg": "Invalid team allocation" },
    { "code": 6007, "name": "InvalidCliff", "msg": "Invalid cliff period" },
    { "code": 6008, "name": "InvalidVestingDuration", "msg": "Invalid vesting duration" },
    { "code": 6009, "name": "CliffNotReached", "msg": "Cliff not reached" },
    { "code": 6010, "name": "NothingToClaim", "msg": "Nothing to claim" },
    { "code": 6011, "name": "VestingNotInitialized", "msg": "Vesting not initialized" },
    { "code": 6012, "name": "Unauthorized", "msg": "Unauthorized" },
    { "code": 6013, "name": "Overflow", "msg": "Overflow" }
  ]
};

