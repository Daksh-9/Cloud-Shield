"""
Development server runner.
"""
import sys
import asyncio
import uvicorn
from app.config import settings

# --- WINDOWS ASYNCIO BUG FIX ---
# Forces Python to use the Proactor loop on Windows, which supports subprocesses.
if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    )