# 2025 Tax Filing Software

A standalone desktop application to help calculate and file 2025 taxes (Federal and California) using Google Gemini for document extraction.

## Features

- **LLM Extraction**: Uses Google Gemini to extract data from user-uploaded PDFs and images containing W2s, 1099s, K-1s, and other tax documents.
- **2025 Tax Estimator**: Applies projected 2025 tax brackets (Rev. Proc. 2024-40) for Federal and 2024/25 estimations for California.
- **Form Generation**: Maps extracted and calculated data into fillable fields for official IRS (1040) and CA State (540) forms.

## Instructions to Build and Run

To set up the project locally:

1. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Run the Application:**
   To launch the local desktop GUI:
   ```bash
   PYTHONPATH=. python src/main.py
   ```

3. **Build the Executable:**
   To bundle the application into a standalone cross-platform executable using PyInstaller:
   ```bash
   ./build.sh
   ```
   The compiled executable will be available in the `dist/TaxFiler2025/` folder.

## How to Use

1. **Configure LLM**: Upon opening the application, insert your Google Gemini API key into the Settings panel. Select your filing status.
2. **Upload Documents**: Click "Select Tax Documents" to load PDFs or images of your W2s, 1099s, etc. Click "Extract Data with LLM" to automatically populate the Review table.
3. **Review & Calculate**: Inspect the extracted W2 wages, interest income, K-1 business income, foreign income, and adjustment contributions. Fix any fields manually if needed.
4. **Generate Forms**: Click "Calculate Taxes" to run the local tax math engine, then click "Generate Official Tax Forms" to create filled IRS 1040 and CA 540 PDFs.
