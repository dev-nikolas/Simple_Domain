from fastapi import APIRouter, HTTPException, Request, status
from simple_domain.service.modular_schemas import SettingsResponse, SettingsUpdate

router = APIRouter(prefix="/v1/settings", tags=["settings"])


@router.get("", response_model=SettingsResponse)
def get_settings(request: Request):
    repo = request.app.state.settings_repo
    return repo.get_all()


@router.patch("", response_model=SettingsResponse)
def update_settings(request: Request, payload: SettingsUpdate):
    repo = request.app.state.settings_repo
    data = payload.model_dump(exclude_unset=True)
    updates = {}
    if "preferences" in data and isinstance(data["preferences"], dict):
        updates.update(data["preferences"])
    for k, v in data.items():
        if k != "preferences" and v is not None:
            updates[k] = v

    if not updates:
        return repo.get_all()
    try:
        repo.update_preferences(updates)
        return repo.get_all()
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post("/reset", response_model=SettingsResponse)
def reset_settings(request: Request):
    repo = request.app.state.settings_repo
    repo.reset_to_defaults()
    return repo.get_all()


@router.get("/mode")
def get_system_mode(request: Request):
    repo = request.app.state.settings_repo
    prefs = repo.get_preferences()
    return {"mode": prefs.get("active_mode", "chat")}


@router.post("/mode")
def set_system_mode(request: Request, payload: dict):
    m = payload.get("mode", "chat")
    if m not in ("chat", "sandbox"):
        raise HTTPException(status_code=400, detail="El modo debe ser 'chat' o 'sandbox'.")
    repo = request.app.state.settings_repo
    updated = repo.update_preferences({"active_mode": m})
    return {"status": "success", "mode": updated.get("active_mode", m)}


@router.post("/wipe-all")
def wipe_all_data(request: Request):
    """Purga total de datos: conversaciones, corridas de sandbox, investigaciones y preferencias."""
    cleared = {}

    conv_repo = getattr(request.app.state, "conversation_repo", None)
    if conv_repo:
        count = conv_repo.delete_all()
        cleared["conversations"] = count

    exp_repo = getattr(request.app.state, "experiment_repo", None)
    if exp_repo:
        exp_repo.store.write([])
        cleared["experiments"] = True

    sb_repo = getattr(request.app.state, "sandbox_repo", None)
    if sb_repo:
        sb_repo.index_store.write([])
        cleared["sandbox_runs"] = True

    ana_repo = getattr(request.app.state, "analysis_repo", None)
    if ana_repo:
        ana_repo.store.write([])
        cleared["analyses"] = True

    set_repo = getattr(request.app.state, "settings_repo", None)
    if set_repo:
        set_repo.reset_to_defaults()
        cleared["settings"] = "reset_to_defaults"

    return {"status": "success", "cleared": cleared}

