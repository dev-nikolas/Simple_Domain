from pathlib import Path
from typing import Optional
import asyncio
import os
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from simple_domain.jobs.coordinator import JobCoordinator
from simple_domain.jobs.events import EventBroker
from simple_domain.jobs.sandbox_runner import SandboxRunner
from simple_domain.repositories.analysis import AnalysisRepository
from simple_domain.repositories.archives import ArchiveRepository
from simple_domain.repositories.conversations import ConversationRepository
from simple_domain.repositories.data_sources import DataSourceRepository
from simple_domain.repositories.experiments import ExperimentRepository
from simple_domain.repositories.patterns import PatternRepository
from simple_domain.repositories.sandbox import SandboxRepository
from simple_domain.repositories.settings import SettingsRepository

from simple_domain.service.routes.analysis import router as analysis_router
from simple_domain.service.routes.archive import router as archive_router
from simple_domain.service.routes.conversations import router as conversations_router
from simple_domain.service.routes.data_sources import router as ds_router
from simple_domain.service.routes.patterns import router as patterns_router
from simple_domain.service.routes.research import router as research_router
from simple_domain.service.routes.sandbox import router as sandbox_router
from simple_domain.service.routes.settings import router as settings_router
from simple_domain.storage.json_store import JsonStore, StorageCorruptionError


def get_canonical_storage_dir(custom_dir: Optional[str] = None) -> str:
    """Resuelve la ubicación canónica y estable del almacenamiento en el proyecto."""
    if custom_dir:
        resolved = os.path.abspath(custom_dir)
    elif os.environ.get("SIMPLE_DOMAIN_DATA_DIR"):
        resolved = os.path.abspath(os.environ["SIMPLE_DOMAIN_DATA_DIR"])
    else:
        project_root = Path(__file__).resolve().parents[3]
        resolved = str(project_root / "storage")
    os.makedirs(resolved, exist_ok=True)
    return resolved


def setup_modular_services(app: FastAPI, storage_dir: Optional[str] = None) -> None:
    """Configura el almacenamiento canónico JSON, repositorios y routers modulares."""
    base_dir = get_canonical_storage_dir(storage_dir)

    research_path = os.path.join(base_dir, "research.json")
    if not os.path.exists(research_path) and os.path.exists(os.path.join(base_dir, "experiments.json")):
        research_path = os.path.join(base_dir, "experiments.json")

    exp_repo = ExperimentRepository(JsonStore(research_path))
    ds_repo = DataSourceRepository(JsonStore(os.path.join(base_dir, "data_sources.json")))
    pat_repo = PatternRepository(JsonStore(os.path.join(base_dir, "patterns.json")))
    set_repo = SettingsRepository(JsonStore(os.path.join(base_dir, "settings.json")))
    ana_repo = AnalysisRepository(JsonStore(os.path.join(base_dir, "analyses.json")))
    conv_repo = ConversationRepository(JsonStore(os.path.join(base_dir, "conversations.json"), default_factory=list))
    arc_repo = ArchiveRepository(base_dir)
    sandbox_repo = SandboxRepository(base_dir)

    event_broker = EventBroker(arc_repo, sandbox_repo)
    coordinator = JobCoordinator(arc_repo, conv_repo, event_broker)
    sandbox_runner = SandboxRunner(sandbox_repo, event_broker)

    app.state.storage_dir = base_dir
    app.state.experiment_repo = exp_repo
    app.state.data_source_repo = ds_repo
    app.state.data_sources_repo = ds_repo
    app.state.pattern_repo = pat_repo
    app.state.patterns_repo = pat_repo
    app.state.settings_repo = set_repo
    app.state.analysis_repo = ana_repo
    app.state.conversation_repo = conv_repo
    app.state.archive_repo = arc_repo
    app.state.sandbox_repo = sandbox_repo
    app.state.sandbox_runner = sandbox_runner
    app.state.event_broker = event_broker
    app.state.job_coordinator = coordinator

    @app.on_event("startup")
    async def on_startup():
        coordinator.start()
        await coordinator.recover_unfinished_jobs()

    @app.on_event("shutdown")
    def on_shutdown():
        coordinator.stop()

    @app.exception_handler(StorageCorruptionError)
    def handle_storage_corruption(_req: Request, exc: StorageCorruptionError):
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": str(exc), "error_code": "STORAGE_CORRUPTED"},
        )

    app.include_router(research_router)
    app.include_router(ds_router)
    app.include_router(patterns_router)
    app.include_router(settings_router)
    app.include_router(analysis_router)
    app.include_router(archive_router)
    app.include_router(conversations_router)
    app.include_router(sandbox_router)
