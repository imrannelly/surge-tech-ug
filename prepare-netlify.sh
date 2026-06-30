#!/bin/sh
set -eu

rm -rf dist
mkdir -p dist
cp ./*.html dist/
cp ecommerce.css ecommerce.js products-data.js supabase-config.js dist/
cp -R Images dist/Images
find dist -name '.DS_Store' -delete
