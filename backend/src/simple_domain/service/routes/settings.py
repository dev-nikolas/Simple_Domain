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
