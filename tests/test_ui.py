import sys
import pytest
from PyQt6.QtWidgets import QApplication
from src.ui.main_window import TaxAppMainWindow

@pytest.fixture(scope="session")
def qapp():
    app = QApplication(sys.argv)
    yield app
    app.quit()

def test_ui_initialization(qapp):
    window = TaxAppMainWindow()
    assert window.windowTitle() == "2025 Tax Filing Software (Est.)"
    assert window.api_key_input.placeholderText() == "Enter Google Gemini API Key"
    assert window.wages_input.text() == "0.0"
