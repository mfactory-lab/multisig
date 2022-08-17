#!/usr/bin/make

cwd = $(shell pwd)
#cluster = "https://jpoolone.genesysgo.net"
#cluster = "https://solana-api.projectserum.com"
#cluster = "https://mainnet.rpcpool.com"
#cluster = "https://solana-api.syndica.io/access-token/Ay411Gnu2mddZxXvj594Dvlt4LHLhWCGCtXueiPr9OJy6IAGBY1X9D1wYndnozXb/rpc"
#cluster = "mainnet"
cluster = "devnet"
program = ""

# get program id by name
program_id = $(shell sed -n 's/^ *${program}.*=.*"\([^"]*\)".*/\1/p' Anchor.toml | head -1)

idl_ts = "$(cwd)/packages/$(program)/src/sdk/idl"

.DEFAULT_GOAL: help

help: ## Show this help
	@printf "\033[33m%s:\033[0m\n" 'Available commands'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[32m%-18s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# ----------------

.PHONY: build
build: ## Build program
	anchor build -p $(program) -t $(idl_ts)

.PHONY: deploy
deploy: build ## Deploy program
	anchor deploy -p $(program) --provider.cluster $(cluster)

.PHONY: upgrade
upgrade: build ## Upgrade program
	anchor upgrade -p $(program_id) --provider.cluster $(cluster) ./target/deploy/$(program).so

.PHONY: test
test: ## Test program
	anchor test --skip-lint --skip-local-validator --provider.cluster localnet
