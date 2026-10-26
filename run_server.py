#!/usr/bin/env python3
"""
Simple Domain — Script de inicio directo del servidor HTTP local
Permite iniciar el servidor con: python run_server.py --port 4000
"""

import os
import sys
from pathlib import Path

# Registrar backend/src en sys.path
root_dir = Path(__file__).resolve().parent
src_dir = root_dir / "backend" / "src"
if str(src_dir) not in sys.path:
    sys.path.insert(0, str(src_dir))

if __name__ == "__main__":
    from simple_domain.service.server import main
    main()
