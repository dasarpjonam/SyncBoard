import pytest
import os
from src.calculator import calculate_federal_tax, calculate_ca_state_tax, get_standard_deduction, get_ca_standard_deduction
from src.pdf_generator import generate_tax_forms

def test_full_pipeline_calculations(tmp_path):
    extracted_data = {
        "w2_wages": 150000.0,
        "interest_income": 500.0,
        "dividend_income": 1200.0,
        "k1_income": -5000.0,
        "foreign_income": 0.0,
        "hsa_contributions": 3000.0,
        "ira_contributions": 6000.0,
        "dependent_count": 1
    }

    total_income = sum([
        extracted_data["w2_wages"],
        extracted_data["interest_income"],
        extracted_data["dividend_income"],
        extracted_data["k1_income"],
        extracted_data["foreign_income"]
    ])

    assert total_income == 146700.0

    adjustments = extracted_data["hsa_contributions"] + extracted_data["ira_contributions"]
    assert adjustments == 9000.0

    agi = total_income - adjustments
    assert agi == 137700.0

    status = "married_joint"

    fed_deduction = get_standard_deduction(status)
    assert fed_deduction == 30000.0

    fed_taxable = max(0, agi - fed_deduction)
    assert fed_taxable == 107700.0

    fed_tax = calculate_federal_tax(fed_taxable, status)

    ca_deduction = get_ca_standard_deduction(status)
    ca_taxable = max(0, agi - ca_deduction)
    ca_tax = calculate_ca_state_tax(ca_taxable, status)

    fed_calc_data = {
        "wages": extracted_data["w2_wages"],
        "standard_deduction": fed_deduction,
        "taxable_income": fed_taxable,
        "tax": fed_tax
    }
    ca_calc_data = {
        "wages": extracted_data["w2_wages"],
        "taxable_income": ca_taxable,
        "tax": ca_tax
    }

    generate_tax_forms(fed_calc_data, ca_calc_data, str(tmp_path))

    assert os.path.exists(tmp_path / "completed_1040.pdf")
    assert os.path.exists(tmp_path / "completed_540.pdf")
