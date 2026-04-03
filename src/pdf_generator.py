import os
from pypdf import PdfReader, PdfWriter

def generate_tax_forms(
    federal_data: dict,
    state_data: dict,
    output_dir: str
):
    os.makedirs(output_dir, exist_ok=True)

    fed_template = "forms/f1040.pdf"
    if os.path.exists(fed_template):
        reader = PdfReader(fed_template)
        writer = PdfWriter()
        writer.append_pages_from_reader(reader)

        form_data = {
            "topmostSubform[0].Page1[0].f1_02[0]": str(federal_data.get("wages", 0)),
            "topmostSubform[0].Page1[0].f1_11[0]": str(federal_data.get("standard_deduction", 0)),
            "topmostSubform[0].Page2[0].f2_01[0]": str(federal_data.get("taxable_income", 0)),
            "topmostSubform[0].Page2[0].f2_02[0]": str(federal_data.get("tax", 0)),
        }

        try:
            writer.update_page_form_field_values(writer.pages[0], form_data)
            writer.update_page_form_field_values(writer.pages[1], form_data)
        except Exception:
            pass

        with open(os.path.join(output_dir, "completed_1040.pdf"), "wb") as f:
            writer.write(f)

    state_template = "forms/ca540.pdf"
    if os.path.exists(state_template):
        reader = PdfReader(state_template)
        writer = PdfWriter()
        writer.append_pages_from_reader(reader)

        form_data = {
            "topmostSubform[0].Page1[0].Wages[0]": str(state_data.get("wages", 0)),
            "topmostSubform[0].Page2[0].TaxableIncome[0]": str(state_data.get("taxable_income", 0)),
            "topmostSubform[0].Page2[0].Tax[0]": str(state_data.get("tax", 0)),
        }

        try:
            for page in writer.pages:
                writer.update_page_form_field_values(page, form_data)
        except Exception:
            pass

        with open(os.path.join(output_dir, "completed_540.pdf"), "wb") as f:
            writer.write(f)
