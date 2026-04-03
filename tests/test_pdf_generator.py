import os
from src.pdf_generator import generate_tax_forms

def test_generate_tax_forms(tmp_path):
    fed_data = {
        "wages": 100000,
        "standard_deduction": 15000,
        "taxable_income": 85000,
        "tax": 10000
    }
    state_data = {
        "wages": 100000,
        "taxable_income": 85000,
        "tax": 5000
    }

    os.makedirs("forms", exist_ok=True)
    if not os.path.exists("forms/f1040.pdf"):
        with open("forms/f1040.pdf", "w") as f:
            f.write("%PDF-1.4\n")
    if not os.path.exists("forms/ca540.pdf"):
        with open("forms/ca540.pdf", "w") as f:
            f.write("%PDF-1.4\n")

    generate_tax_forms(fed_data, state_data, str(tmp_path))

    assert os.path.exists(tmp_path / "completed_1040.pdf")
    assert os.path.exists(tmp_path / "completed_540.pdf")
