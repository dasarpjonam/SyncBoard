"""
Federal and California Tax Calculator (2024/2025 Estimates)
"""

def calculate_federal_tax(taxable_income: float, filing_status: str) -> float:
    brackets = {
        "single": [
            (11925, 0.10),
            (48475, 0.12),
            (103350, 0.22),
            (197300, 0.24),
            (250525, 0.32),
            (626350, 0.35),
            (float("inf"), 0.37)
        ],
        "married_joint": [
            (23850, 0.10),
            (96950, 0.12),
            (206700, 0.22),
            (394600, 0.24),
            (501050, 0.32),
            (751600, 0.35),
            (float("inf"), 0.37)
        ]
    }

    if filing_status not in brackets:
        raise ValueError(f"Invalid filing status: {filing_status}")

    tax = 0.0
    prev_limit = 0.0
    for limit, rate in brackets[filing_status]:
        if taxable_income > limit:
            tax += (limit - prev_limit) * rate
            prev_limit = limit
        else:
            tax += (taxable_income - prev_limit) * rate
            break

    return tax

def calculate_ca_state_tax(taxable_income: float, filing_status: str) -> float:
    brackets = {
         "single": [
            (10412, 0.01),
            (24684, 0.02),
            (38959, 0.04),
            (54081, 0.06),
            (68350, 0.08),
            (349137, 0.093),
            (418961, 0.103),
            (698271, 0.113),
            (float("inf"), 0.123)
        ],
        "married_joint": [
            (20824, 0.01),
            (49368, 0.02),
            (77918, 0.04),
            (108162, 0.06),
            (136700, 0.08),
            (698274, 0.093),
            (837922, 0.103),
            (1396542, 0.113),
            (float("inf"), 0.123)
        ]
    }

    if filing_status not in brackets:
        raise ValueError(f"Invalid filing status: {filing_status}")

    tax = 0.0
    prev_limit = 0.0
    for limit, rate in brackets[filing_status]:
        if taxable_income > limit:
            tax += (limit - prev_limit) * rate
            prev_limit = limit
        else:
            tax += (taxable_income - prev_limit) * rate
            break

    if taxable_income > 1000000:
        tax += (taxable_income - 1000000) * 0.01

    return tax

def get_standard_deduction(filing_status: str) -> float:
    if filing_status == "single":
        return 15000.0
    elif filing_status == "married_joint":
        return 30000.0
    return 0.0

def get_ca_standard_deduction(filing_status: str) -> float:
    if filing_status == "single":
        return 5363.0
    elif filing_status == "married_joint":
        return 10726.0
    return 0.0
