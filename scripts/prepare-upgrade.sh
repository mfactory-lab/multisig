#!/bin/bash

set -e

#URL=https://jpoolone.genesysgo.net
URL=https://devnet.genesysgo.net
MULTISIG_AUTHORITY=Hr2A9RdKM5rMsi863S53MzxquFWrQ6oHr5L1H6gqPCBf
BPF_FILE=target/verifiable/multisig.so

#echo "Building the program..."
#anchor build
#ls -l $BPF_FILE
#
#echo "Writing program buffer..."
#export BUFFER_ADDRESS=$(solana program write-buffer -v -u $URL $BPF_FILE | sed -n 's/.*Buffer://p')

BUFFER_ADDRESS=BUaAh85z3NhzzobHXbj8e5YFs2vwhpt8B3Q2tUTuFx2w
solana program show $BUFFER_ADDRESS
solana program set-buffer-authority --new-buffer-authority $MULTISIG_AUTHORITY $BUFFER_ADDRESS
solana program show $BUFFER_ADDRESS

echo "Done"
