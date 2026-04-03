import pytest
from unittest.mock import patch, MagicMock
from src.extractor import extract_tax_data

@patch("src.extractor.genai.upload_file")
@patch("src.extractor.genai.delete_file")
@patch("src.extractor.genai.GenerativeModel")
def test_extract_tax_data_mocked(mock_generative_model, mock_delete_file, mock_upload_file):
    mock_file = MagicMock()
    mock_file.name = "files/test_mock"
    mock_upload_file.return_value = mock_file

    mock_model_instance = MagicMock()
    mock_response = MagicMock()
    mock_response.text = '{"w2_wages": 100000.0, "w2_federal_withheld": 15000.0, "w2_state_withheld": 5000.0, "interest_income": 100.0, "dividend_income": 0.0, "k1_income": 0.0, "foreign_income": 0.0, "hsa_contributions": 0.0, "ira_contributions": 0.0, "dependent_count": 1}'
    mock_model_instance.generate_content.return_value = mock_response
    mock_generative_model.return_value = mock_model_instance

    data = extract_tax_data(["dummy_path.pdf"])

    assert data["w2_wages"] == 100000.0
    assert data["dependent_count"] == 1

    mock_delete_file.assert_called_once_with("files/test_mock")
