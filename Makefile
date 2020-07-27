# ---------------------------
# Generated by rel-engage

# This task tells make how to 'build' n-gage. It npm installs n-gage, and # Once that's done it overwrites the file with its own contents - this
# ensures the timestamp on the file is recent, so make won't think the file
# is out of date and try to rebuild it every time
node_modules/@financial-times/rel-engage/index.mk:
	@echo "Updating rel-engage"
	@npm install --save-dev @financial-times/rel-engage
	@touch $@

# If, by the end of parsing your `Makefile`, `make` finds that any files
# referenced with `-include` don't exist or are out of date, it will run any
# tasks it finds that match the missing file. So if n-gage *is* installed
# it will just be included; if not, it will look for a task to run
-include node_modules/@financial-times/rel-engage/index.mk

# End generated by rel-engage
# ---------------------------
LOCAL_BOLT_URL=bolt://localhost:7687
BIZ_OPS_BOLT_URL=${NEO4J_BOLT_URL}
NEO4J_VERSION=3.5.0
PRODUCT_NAME=biz-ops
PROJECT_NAME=biz-ops-api


.PHONY: test


# Install and dependency management
env:
	echo "No secret environment variables needed in test"

# actually gets credentials from vault
env-biz-ops: test-env

verify:

unprepublish:
	sed s/"dist\/"/"src\/"/ packages/tc-ui/package.json > tmp && mv tmp packages/tc-ui/package.json

## Note - no need to clean up ./packages/**/package-lock.json as they are installed lockless
## https://github.com/Financial-Times/treecreeper/blob/master/package.json#L59
clean-deps: unprepublish
	rm -rf packages/*/node_modules
	rm -rf node_modules
	rm package-lock.json
	npm install

# note that this invokes npm install, and in package.json there is a postinstall script
# defined too, which installs all the node_modules for the packages
install: unprepublish


# Building and running

## Builds browser files for tc-ui (in watch mode when local)
build-statics:
	@if [ -z $(CI) ]; \
		then $(info Webpack bundling modules ...) webpack --mode=development --watch; \
		else $(info Webpack bundling modules ...) webpack --mode=production; \
	fi

run-db:
	docker-compose up

run-app:
	NEO4J_BOLT_URL=${LOCAL_BOLT_URL} \
	TREECREEPER_TEST=true \
	TREECREEPER_SCHEMA_DIRECTORY=example-schema \
	nodemon --inspect demo/api.js

run-app-biz-ops:
	WITH_DOCSTORE=true \
	NEO4J_BOLT_URL=${BIZ_OPS_BOLT_URL} \
	TREECREEPER_SCHEMA_URL=${SCHEMA_BASE_URL} \
	nodemon --inspect demo/api.js

run:
	@concurrently "make run-db" "make run-app" "make build-statics"

run-biz-ops:
	@concurrently "make run-app-biz-ops" "make build-statics"


# Testing & CI

## Creates indexes on the DB
## Run once before all tests in CI to avoid different spec runs from messing up the indexes whenever they init
init-db:
	NEO4J_BOLT_URL=${LOCAL_BOLT_URL} TREECREEPER_SCHEMA_DIRECTORY=example-schema packages/tc-api-db-manager/index.js

## Installs neo4j in CI
run-test-db:
	java -version; \
  mkdir -p neo4j; \
  wget -q dist.neo4j.org/neo4j-community-$(NEO4J_VERSION)-unix.tar.gz; \
  tar -xzf neo4j-community-$(NEO4J_VERSION)-unix.tar.gz -C neo4j --strip-components 1; \
  sed -i "s|# dbms.security.auth_enabled=false|dbms.security.auth_enabled=false|g" neo4j/conf/neo4j.conf;\
  ./scripts/neo4j-plugins; \
	dbms_memory_heap_initial_size="1024m" dbms_memory_heap_max_size="1024m" neo4j/bin/neo4j start; \
  ./scripts/neo4j-wait-for-start;
	make init-db

test:
	@if [ -z $(CI) ]; \
		then NEO4J_BOLT_URL=${LOCAL_BOLT_URL} TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema DEBUG=true TIMEOUT=500000 \
			jest --config="./jest.config.js" "${pkg}.*__tests__.*${spec}.*.spec.js" --testEnvironment=node --watch; \
		else NEO4J_BOLT_URL=${LOCAL_BOLT_URL} TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
			jest --config="./jest.config.js" "__tests__.*/*.spec.js" --testEnvironment=node --runInBand --ci --reporters=default --reporters=jest-junit --detectOpenHandles --forceExit; \
	fi

## Cypress stuff used in CI

### Checks that cypress will be able to run ok
cypress-verify:
	TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
	cypress verify

### Runs tests for pages
cypress-page: build-statics
	start-server-and-test "make run-app" http-get://localhost:8888/MainType/create "make cypress-run-page"

### Runs tests for primitive components
cypress-primitives: build-statics
	start-server-and-test "make run-app" http-get://localhost:8888/MainType/create "make cypress-run-primitives"

## Cypress stuff used in local dev

### Opens an interactive UI for specifying which tests to run/re-run
cypress-open:
	TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
	cypress open

### Runs tests for pages (assumes the app is running in another terminal)
cypress-run-page:
	TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
	cypress run --spec "packages/tc-ui/src/pages/**/__tests__/**.cyp.js" --config video=false

### Runs tests for primitive components (assumes the app is running in another terminal)
cypress-run-primitives:
	TREECREEPER_TEST=true TREECREEPER_SCHEMA_DIRECTORY=example-schema \
	cypress run --spec "packages/tc-ui/src/primitives/**/__tests__/**.cyp.js" --config video=false

# Deploy

prepublish:
	babel packages/tc-ui/src -D --out-dir packages/tc-ui/dist
	sed s/"src\/"/"dist\/"/ packages/tc-ui/package.json > tmp && mv tmp packages/tc-ui/package.json

monorepo-publish: prepublish
	npx athloi version --concurrency 10 $(CIRCLE_TAG)
	npx athloi publish --concurrency 10 -- --access public
