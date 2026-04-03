from src.calculator import calculate_federal_tax, calculate_ca_state_tax

def test_federal_tax_single():
    assert abs(calculate_federal_tax(11925, "single") - 1192.5) < 0.01
    assert abs(calculate_federal_tax(20000, "single") - 2161.5) < 0.01

def test_federal_tax_married_joint():
    assert abs(calculate_federal_tax(23850, "married_joint") - 2385.0) < 0.01

def test_ca_tax_single():
    assert abs(calculate_ca_state_tax(10412, "single") - 104.12) < 0.01
    tax = calculate_ca_state_tax(1100000, "single")
    assert tax > 1000

def test_ca_tax_married_joint():
    assert abs(calculate_ca_state_tax(20824, "married_joint") - 208.24) < 0.01
