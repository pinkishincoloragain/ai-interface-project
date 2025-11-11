#!/bin/bash
cd ../temp-lambda
pnpm install --prod --frozen-lockfile
zip -r ../dist/lambda.zip .