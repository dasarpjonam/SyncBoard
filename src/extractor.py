import os
import json
import google.generativeai as genai
import typing_extensions as typing

class TaxData(typing.TypedDict):
    w2_wages: float
    w2_federal_withheld: float
    w2_state_withheld: float
    interest_income: float
    dividend_income: float
    k1_income: float
    foreign_income: float
    hsa_contributions: float
    ira_contributions: float
    dependent_count: int

def configure_llm(api_key: str):
    genai.configure(api_key=api_key)

def extract_tax_data(file_paths: list[str]) -> dict:
    model = genai.GenerativeModel("gemini-1.5-pro-latest")

    uploaded_files = []
    try:
        for path in file_paths:
            uploaded_file = genai.upload_file(path=path)
            uploaded_files.append(uploaded_file)

        prompt = """
        You are a highly capable tax assistant. I have provided you with one or more tax documents (such as W2s, 1099-INTs, 1099-DIVs, Schedule K-1s, HSA forms, IRA contributions, etc.).

        Please extract the relevant tax information and return ONLY a valid JSON object matching the requested schema. If a value is not found in any of the documents, default to 0.0 for monetary values and 0 for integers.

        Be careful to look for:
        - Wages, tips, other comp (Box 1 of W2) -> w2_wages
        - Federal income tax withheld (Box 2 of W2) -> w2_federal_withheld
        - State income tax (Box 17 of W2) -> w2_state_withheld
        - Interest income -> interest_income
        - Dividend income -> dividend_income
        - K-1 ordinary business income -> k1_income
        - Foreign/India income -> foreign_income
        - HSA contributions -> hsa_contributions
        - IRA contributions -> ira_contributions
        - Number of dependents mentioned -> dependent_count
        """

        contents = [prompt] + uploaded_files

        response = model.generate_content(
            contents,
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=TaxData
            )
        )

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            print("Failed to decode JSON from LLM response.")
            return {
                "w2_wages": 0.0,
                "w2_federal_withheld": 0.0,
                "w2_state_withheld": 0.0,
                "interest_income": 0.0,
                "dividend_income": 0.0,
                "k1_income": 0.0,
                "foreign_income": 0.0,
                "hsa_contributions": 0.0,
                "ira_contributions": 0.0,
                "dependent_count": 0
            }

    finally:
        for f in uploaded_files:
            try:
                genai.delete_file(f.name)
            except Exception as e:
                print(f"Failed to delete file {f.name}: {e}")
