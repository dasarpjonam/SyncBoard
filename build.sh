#!/bin/bash
echo "Building Executable with PyInstaller..."
# Remove old builds if they exist
rm -rf build dist

# Build the executable
# We include the forms directory so the PDFs are bundled with the app
pyinstaller --noconfirm --onedir --windowed \
    --add-data "forms:forms" \
    --name "TaxFiler2025" \
    src/main.py

echo "Build complete. Executable is located in the dist/TaxFiler2025/ directory."
