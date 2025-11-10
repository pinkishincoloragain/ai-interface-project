#!/bin/bash
cd ../temp-lambda
npm install --production --no-package-lock
zip -r ../dist/lambda.zip .