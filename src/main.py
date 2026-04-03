import sys
from PyQt6.QtWidgets import QApplication
from src.ui.main_window import TaxAppMainWindow

def main():
    app = QApplication(sys.argv)
    window = TaxAppMainWindow()
    window.show()
    sys.exit(app.exec())

if __name__ == '__main__':
    main()
