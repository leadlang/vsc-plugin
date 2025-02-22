#!/bin/sh

# Read the version from the .version file
v=$(cat .version)

echo Bash

# Append the TAG_NAME to the GITHUB_OUTPUT environment variable
echo "TAG_NAME=$v" >> "$GITHUB_OUTPUT"