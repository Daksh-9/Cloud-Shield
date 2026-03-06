"""
Development server runner.

Starts the FastAPI app and a background Suricata shipper subprocess.
"""
import sys
import asyncio
import subprocess
from pathlib import Path

import uvicorn

from app.config import settings

# --- WINDOWS ASYNCIO BUG FIX ---
# Forces Python to use the Proactor loop on Windows, which supports subprocesses.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())


if __name__ == "__main__":
    shipper_process: subprocess.Popen | None = None

    try:
        # Resolve the path to suricata_shipper.py (sibling of this file)
        backend_dir = Path(__file__).resolve().parent
        shipper_path = backend_dir / "suricata_shipper.py"

        if shipper_path.exists():
            cmd = [sys.executable, str(shipper_path)]
            shipper_process = subprocess.Popen(
                cmd,
                cwd=str(backend_dir),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )

        uvicorn.run(
            "app.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.DEBUG,
            log_level="info",
        )
    except KeyboardInterrupt:
        # Allow graceful shutdown on Ctrl+C
        pass
    finally:
        if shipper_process and shipper_process.poll() is None:
            shipper_process.terminate()
            try:
                shipper_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                shipper_process.kill()