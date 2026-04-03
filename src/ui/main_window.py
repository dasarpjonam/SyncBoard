import sys
import os
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QLabel, QLineEdit, QPushButton, QFileDialog, QFormLayout,
    QMessageBox, QComboBox, QGroupBox, QScrollArea
)
from PyQt6.QtCore import Qt

from src.calculator import (
    calculate_federal_tax, calculate_ca_state_tax,
    get_standard_deduction, get_ca_standard_deduction
)
from src.extractor import extract_tax_data, configure_llm
from src.pdf_generator import generate_tax_forms

class TaxAppMainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("2025 Tax Filing Software (Est.)")
        self.resize(800, 600)

        self.tax_data = {}
        self.file_paths = []

        self.init_ui()

    def init_ui(self):
        main_widget = QWidget()
        main_layout = QVBoxLayout()

        settings_group = QGroupBox("Settings")
        settings_layout = QFormLayout()
        self.api_key_input = QLineEdit()
        self.api_key_input.setEchoMode(QLineEdit.EchoMode.Password)
        self.api_key_input.setPlaceholderText("Enter Google Gemini API Key")
        settings_layout.addRow("Gemini API Key:", self.api_key_input)

        self.filing_status_combo = QComboBox()
        self.filing_status_combo.addItems(["single", "married_joint"])
        settings_layout.addRow("Filing Status:", self.filing_status_combo)
        settings_group.setLayout(settings_layout)
        main_layout.addWidget(settings_group)

        upload_group = QGroupBox("Document Upload")
        upload_layout = QVBoxLayout()
        self.file_label = QLabel("No files selected.")
        upload_btn = QPushButton("Select Tax Documents (PDF/Images)")
        upload_btn.clicked.connect(self.select_files)

        extract_btn = QPushButton("Extract Data with LLM")
        extract_btn.clicked.connect(self.extract_data)

        upload_layout.addWidget(self.file_label)
        upload_layout.addWidget(upload_btn)
        upload_layout.addWidget(extract_btn)
        upload_group.setLayout(upload_layout)
        main_layout.addWidget(upload_group)

        review_group = QGroupBox("Data Review & Calculation")
        review_layout = QFormLayout()

        self.wages_input = QLineEdit("0.0")
        self.interest_input = QLineEdit("0.0")
        self.dividend_input = QLineEdit("0.0")
        self.k1_input = QLineEdit("0.0")
        self.foreign_input = QLineEdit("0.0")
        self.hsa_input = QLineEdit("0.0")
        self.ira_input = QLineEdit("0.0")

        review_layout.addRow("W2 Wages:", self.wages_input)
        review_layout.addRow("Interest Income:", self.interest_input)
        review_layout.addRow("Dividend Income:", self.dividend_input)
        review_layout.addRow("K-1 Income:", self.k1_input)
        review_layout.addRow("Foreign/India Income:", self.foreign_input)
        review_layout.addRow("HSA Contributions:", self.hsa_input)
        review_layout.addRow("IRA Contributions:", self.ira_input)

        calc_btn = QPushButton("Calculate Taxes")
        calc_btn.clicked.connect(self.calculate_taxes)
        review_layout.addRow(calc_btn)

        review_group.setLayout(review_layout)

        scroll = QScrollArea()
        scroll.setWidgetResizable(True)
        scroll.setWidget(review_group)
        main_layout.addWidget(scroll)

        results_group = QGroupBox("Results & Export")
        results_layout = QVBoxLayout()
        self.results_label = QLabel("Calculated taxes will appear here.")

        export_btn = QPushButton("Generate Official Tax Forms (PDF)")
        export_btn.clicked.connect(self.export_forms)

        results_layout.addWidget(self.results_label)
        results_layout.addWidget(export_btn)
        results_group.setLayout(results_layout)
        main_layout.addWidget(results_group)

        main_widget.setLayout(main_layout)
        self.setCentralWidget(main_widget)

    def select_files(self):
        files, _ = QFileDialog.getOpenFileNames(self, "Select Documents", "", "All Files (*)")
        if files:
            self.file_paths = files
            self.file_label.setText(f"{len(files)} file(s) selected.")

    def extract_data(self):
        api_key = self.api_key_input.text().strip()
        if not api_key:
            QMessageBox.warning(self, "Error", "Please enter your Gemini API Key in Settings.")
            return
        if not self.file_paths:
            QMessageBox.warning(self, "Error", "Please select at least one document.")
            return

        try:
            self.results_label.setText("Extracting data... please wait.")
            QApplication.processEvents()

            configure_llm(api_key)
            self.tax_data = extract_tax_data(self.file_paths)

            self.wages_input.setText(str(self.tax_data.get("w2_wages", 0.0)))
            self.interest_input.setText(str(self.tax_data.get("interest_income", 0.0)))
            self.dividend_input.setText(str(self.tax_data.get("dividend_income", 0.0)))
            self.k1_input.setText(str(self.tax_data.get("k1_income", 0.0)))
            self.foreign_input.setText(str(self.tax_data.get("foreign_income", 0.0)))
            self.hsa_input.setText(str(self.tax_data.get("hsa_contributions", 0.0)))
            self.ira_input.setText(str(self.tax_data.get("ira_contributions", 0.0)))

            self.results_label.setText("Data extracted successfully. Please review and calculate.")
        except Exception as e:
            QMessageBox.critical(self, "Extraction Error", str(e))
            self.results_label.setText("Extraction failed.")

    def calculate_taxes(self):
        try:
            wages = float(self.wages_input.text())
            interest = float(self.interest_input.text())
            dividends = float(self.dividend_input.text())
            k1 = float(self.k1_input.text())
            foreign = float(self.foreign_input.text())
            hsa = float(self.hsa_input.text())
            ira = float(self.ira_input.text())

            total_income = wages + interest + dividends + k1 + foreign
            adjustments = hsa + ira
            agi = total_income - adjustments

            status = self.filing_status_combo.currentText()

            fed_deduction = get_standard_deduction(status)
            fed_taxable = max(0, agi - fed_deduction)
            fed_tax = calculate_federal_tax(fed_taxable, status)

            ca_deduction = get_ca_standard_deduction(status)
            ca_taxable = max(0, agi - ca_deduction)
            ca_tax = calculate_ca_state_tax(ca_taxable, status)

            self.fed_calc_data = {
                "wages": wages,
                "standard_deduction": fed_deduction,
                "taxable_income": fed_taxable,
                "tax": fed_tax
            }
            self.ca_calc_data = {
                "wages": wages,
                "taxable_income": ca_taxable,
                "tax": ca_tax
            }

            summary = (
                f"Total Income: ${total_income:,.2f}\n"
                f"Adjusted Gross Income (AGI): ${agi:,.2f}\n\n"
                f"--- FEDERAL ---\n"
                f"Standard Deduction: ${fed_deduction:,.2f}\n"
                f"Taxable Income: ${fed_taxable:,.2f}\n"
                f"Estimated Tax: ${fed_tax:,.2f}\n\n"
                f"--- CALIFORNIA ---\n"
                f"Standard Deduction: ${ca_deduction:,.2f}\n"
                f"Taxable Income: ${ca_taxable:,.2f}\n"
                f"Estimated Tax: ${ca_tax:,.2f}"
            )
            self.results_label.setText(summary)

        except ValueError:
            QMessageBox.warning(self, "Input Error", "Please ensure all fields contain valid numbers.")

    def export_forms(self):
        if not hasattr(self, 'fed_calc_data') or not hasattr(self, 'ca_calc_data'):
            QMessageBox.warning(self, "Error", "Please calculate taxes first.")
            return

        output_dir = QFileDialog.getExistingDirectory(self, "Select Output Directory")
        if output_dir:
            try:
                generate_tax_forms(self.fed_calc_data, self.ca_calc_data, output_dir)
                QMessageBox.information(self, "Success", f"Forms generated successfully in:\n{output_dir}")
            except Exception as e:
                QMessageBox.critical(self, "Export Error", f"Failed to generate forms:\n{str(e)}")
