export type Multisig = {
  "version": "0.0.3",
  "name": "multisig",
  "instructions": [
    {
      "name": "createMultisig",
      "docs": [
        "Initializes a new multisig account with",
        "a set of owners and a threshold."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "key",
          "type": "publicKey"
        },
        {
          "name": "owners",
          "type": {
            "vec": "publicKey"
          }
        },
        {
          "name": "threshold",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createTransaction",
      "docs": [
        "Creates a new transaction account, automatically signed by the creator,",
        "which must be one of the owners of the multisig."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "instructions",
          "type": {
            "vec": {
              "defined": "TxInstruction"
            }
          }
        }
      ]
    },
    {
      "name": "approve",
      "docs": [
        "Approves a transaction on behalf of an owner of the multisig."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "setOwners",
      "docs": [
        "Sets the owners field on the multisig. The only way this can be invoked",
        "is via a recursive call from execute_transaction -> set_owners."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "multisigSigner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "owners",
          "type": {
            "vec": "publicKey"
          }
        }
      ]
    },
    {
      "name": "changeThreshold",
      "docs": [
        "Changes the execution threshold of the multisig. The only way this can be",
        "invoked is via a recursive call from execute_transaction ->",
        "change_threshold."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "multisigSigner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "threshold",
          "type": "u8"
        }
      ]
    },
    {
      "name": "executeTransaction",
      "docs": [
        "Executes the given transaction if threshold owners have signed it."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "executor",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "closeTransaction",
      "docs": [
        "Close the given transaction"
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "multisig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "docs": [
              "Key used as id to derive"
            ],
            "type": "publicKey"
          },
          {
            "name": "owners",
            "docs": [
              "Owners of the [Multisig]"
            ],
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "threshold",
            "docs": [
              "Minimum number of owner approvals needed to sign a [Transaction]"
            ],
            "type": "u8"
          },
          {
            "name": "transactionCount",
            "docs": [
              "Total number of [Transaction]s on this [Multisig]"
            ],
            "type": "u32"
          },
          {
            "name": "ownerSetSeqno",
            "docs": [
              "Sequence of the ownership change"
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for deriving PDA seeds"
            ],
            "type": "u8"
          },
          {
            "name": "signerBump",
            "docs": [
              "Signer bump seed for deriving PDA seeds"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "transaction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "multisig",
            "docs": [
              "The [Multisig] account this transaction belongs to"
            ],
            "type": "publicKey"
          },
          {
            "name": "index",
            "docs": [
              "The auto-incremented integer index of the transaction"
            ],
            "type": "u32"
          },
          {
            "name": "proposer",
            "docs": [
              "The proposer of the transaction"
            ],
            "type": "publicKey"
          },
          {
            "name": "executor",
            "docs": [
              "The account that executed the transaction"
            ],
            "type": "publicKey"
          },
          {
            "name": "instructions",
            "docs": [
              "List of instructions"
            ],
            "type": {
              "vec": {
                "defined": "TxInstruction"
              }
            }
          },
          {
            "name": "signers",
            "docs": [
              "signers[index] is true if multisig.owners[index] signed the transaction"
            ],
            "type": {
              "vec": "bool"
            }
          },
          {
            "name": "ownerSetSeqno",
            "docs": [
              "Owner set sequence number"
            ],
            "type": "u32"
          },
          {
            "name": "executedAt",
            "docs": [
              "Execution date"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Creation date"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for deriving PDA seeds"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "TxInstruction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "docs": [
              "Target program to execute this instruction"
            ],
            "type": "publicKey"
          },
          {
            "name": "keys",
            "docs": [
              "Metadata for what accounts should be passed to the instruction processor"
            ],
            "type": {
              "vec": {
                "defined": "TxAccountMeta"
              }
            }
          },
          {
            "name": "data",
            "docs": [
              "Opaque data passed to the instruction processor"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "TxAccountMeta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "MultisigCreatedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "owners",
          "type": {
            "vec": "publicKey"
          },
          "index": false
        },
        {
          "name": "threshold",
          "type": "u8",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TransactionCreatedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "transaction",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "proposer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "instructions",
          "type": {
            "vec": {
              "defined": "TxInstruction"
            }
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TransactionApprovedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "transaction",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TransactionExecutedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "transaction",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "executor",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidOwner",
      "msg": "The given owner is not part of this multisig"
    },
    {
      "code": 6001,
      "name": "EmptyOwners",
      "msg": "Owners length must be non zero"
    },
    {
      "code": 6002,
      "name": "UniqueOwners",
      "msg": "Owners must be unique"
    },
    {
      "code": 6003,
      "name": "NotEnoughSigners",
      "msg": "Not enough owners signed this transaction"
    },
    {
      "code": 6004,
      "name": "AlreadyExecuted",
      "msg": "The given transaction has already been executed"
    },
    {
      "code": 6005,
      "name": "AlreadyApproved",
      "msg": "The owner has already approved the transaction"
    },
    {
      "code": 6006,
      "name": "InvalidThreshold",
      "msg": "Threshold must be less than or equal to the number of owners"
    }
  ]
};

export const IDL: Multisig = {
  "version": "0.0.3",
  "name": "multisig",
  "instructions": [
    {
      "name": "createMultisig",
      "docs": [
        "Initializes a new multisig account with",
        "a set of owners and a threshold."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "payer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "key",
          "type": "publicKey"
        },
        {
          "name": "owners",
          "type": {
            "vec": "publicKey"
          }
        },
        {
          "name": "threshold",
          "type": "u8"
        }
      ]
    },
    {
      "name": "createTransaction",
      "docs": [
        "Creates a new transaction account, automatically signed by the creator,",
        "which must be one of the owners of the multisig."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "proposer",
          "isMut": true,
          "isSigner": true
        },
        {
          "name": "systemProgram",
          "isMut": false,
          "isSigner": false
        }
      ],
      "args": [
        {
          "name": "instructions",
          "type": {
            "vec": {
              "defined": "TxInstruction"
            }
          }
        }
      ]
    },
    {
      "name": "approve",
      "docs": [
        "Approves a transaction on behalf of an owner of the multisig."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "setOwners",
      "docs": [
        "Sets the owners field on the multisig. The only way this can be invoked",
        "is via a recursive call from execute_transaction -> set_owners."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "multisigSigner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "owners",
          "type": {
            "vec": "publicKey"
          }
        }
      ]
    },
    {
      "name": "changeThreshold",
      "docs": [
        "Changes the execution threshold of the multisig. The only way this can be",
        "invoked is via a recursive call from execute_transaction ->",
        "change_threshold."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "multisigSigner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": [
        {
          "name": "threshold",
          "type": "u8"
        }
      ]
    },
    {
      "name": "executeTransaction",
      "docs": [
        "Executes the given transaction if threshold owners have signed it."
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "executor",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    },
    {
      "name": "closeTransaction",
      "docs": [
        "Close the given transaction"
      ],
      "accounts": [
        {
          "name": "multisig",
          "isMut": false,
          "isSigner": false
        },
        {
          "name": "transaction",
          "isMut": true,
          "isSigner": false
        },
        {
          "name": "owner",
          "isMut": false,
          "isSigner": true
        }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "multisig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "key",
            "docs": [
              "Key used as id to derive"
            ],
            "type": "publicKey"
          },
          {
            "name": "owners",
            "docs": [
              "Owners of the [Multisig]"
            ],
            "type": {
              "vec": "publicKey"
            }
          },
          {
            "name": "threshold",
            "docs": [
              "Minimum number of owner approvals needed to sign a [Transaction]"
            ],
            "type": "u8"
          },
          {
            "name": "transactionCount",
            "docs": [
              "Total number of [Transaction]s on this [Multisig]"
            ],
            "type": "u32"
          },
          {
            "name": "ownerSetSeqno",
            "docs": [
              "Sequence of the ownership change"
            ],
            "type": "u32"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for deriving PDA seeds"
            ],
            "type": "u8"
          },
          {
            "name": "signerBump",
            "docs": [
              "Signer bump seed for deriving PDA seeds"
            ],
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "transaction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "multisig",
            "docs": [
              "The [Multisig] account this transaction belongs to"
            ],
            "type": "publicKey"
          },
          {
            "name": "index",
            "docs": [
              "The auto-incremented integer index of the transaction"
            ],
            "type": "u32"
          },
          {
            "name": "proposer",
            "docs": [
              "The proposer of the transaction"
            ],
            "type": "publicKey"
          },
          {
            "name": "executor",
            "docs": [
              "The account that executed the transaction"
            ],
            "type": "publicKey"
          },
          {
            "name": "instructions",
            "docs": [
              "List of instructions"
            ],
            "type": {
              "vec": {
                "defined": "TxInstruction"
              }
            }
          },
          {
            "name": "signers",
            "docs": [
              "signers[index] is true if multisig.owners[index] signed the transaction"
            ],
            "type": {
              "vec": "bool"
            }
          },
          {
            "name": "ownerSetSeqno",
            "docs": [
              "Owner set sequence number"
            ],
            "type": "u32"
          },
          {
            "name": "executedAt",
            "docs": [
              "Execution date"
            ],
            "type": {
              "option": "i64"
            }
          },
          {
            "name": "createdAt",
            "docs": [
              "Creation date"
            ],
            "type": "i64"
          },
          {
            "name": "bump",
            "docs": [
              "Bump seed for deriving PDA seeds"
            ],
            "type": "u8"
          }
        ]
      }
    }
  ],
  "types": [
    {
      "name": "TxInstruction",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "programId",
            "docs": [
              "Target program to execute this instruction"
            ],
            "type": "publicKey"
          },
          {
            "name": "keys",
            "docs": [
              "Metadata for what accounts should be passed to the instruction processor"
            ],
            "type": {
              "vec": {
                "defined": "TxAccountMeta"
              }
            }
          },
          {
            "name": "data",
            "docs": [
              "Opaque data passed to the instruction processor"
            ],
            "type": "bytes"
          }
        ]
      }
    },
    {
      "name": "TxAccountMeta",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "pubkey",
            "type": "publicKey"
          },
          {
            "name": "isSigner",
            "type": "bool"
          },
          {
            "name": "isWritable",
            "type": "bool"
          }
        ]
      }
    }
  ],
  "events": [
    {
      "name": "MultisigCreatedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "owners",
          "type": {
            "vec": "publicKey"
          },
          "index": false
        },
        {
          "name": "threshold",
          "type": "u8",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TransactionCreatedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "transaction",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "proposer",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "instructions",
          "type": {
            "vec": {
              "defined": "TxInstruction"
            }
          },
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TransactionApprovedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "transaction",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "owner",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    },
    {
      "name": "TransactionExecutedEvent",
      "fields": [
        {
          "name": "multisig",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "transaction",
          "type": "publicKey",
          "index": true
        },
        {
          "name": "executor",
          "type": "publicKey",
          "index": false
        },
        {
          "name": "timestamp",
          "type": "i64",
          "index": false
        }
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "InvalidOwner",
      "msg": "The given owner is not part of this multisig"
    },
    {
      "code": 6001,
      "name": "EmptyOwners",
      "msg": "Owners length must be non zero"
    },
    {
      "code": 6002,
      "name": "UniqueOwners",
      "msg": "Owners must be unique"
    },
    {
      "code": 6003,
      "name": "NotEnoughSigners",
      "msg": "Not enough owners signed this transaction"
    },
    {
      "code": 6004,
      "name": "AlreadyExecuted",
      "msg": "The given transaction has already been executed"
    },
    {
      "code": 6005,
      "name": "AlreadyApproved",
      "msg": "The owner has already approved the transaction"
    },
    {
      "code": 6006,
      "name": "InvalidThreshold",
      "msg": "Threshold must be less than or equal to the number of owners"
    }
  ]
};
