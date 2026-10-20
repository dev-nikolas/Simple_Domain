from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Request, status
from simple_domain.service.modular_schemas import (
    PatternCreate,
    PatternResponse,
    PatternUpdate,
)

router = APIRouter(prefix="/v1/patterns", tags=["patterns"])


@router.get("", response_model=List[PatternResponse])
def list_patterns(
    request: Request,
    pattern_type: Optional[str] = Query(None),
):
    repo = request.app.state.pattern_repo
    items = repo.list_all(pattern_type=pattern_type)
    return [PatternResponse(**x) for x in items]


@router.post("", response_model=PatternResponse, status_code=status.HTTP_201_CREATED)
def create_pattern(request: Request, payload: PatternCreate):
    repo = request.app.state.pattern_repo
    ds_repo = getattr(request.app.state, "data_source_repo", None)
    if payload.source_id and ds_repo:
        if not ds_repo.get_by_id(payload.source_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data source with id '{payload.source_id}' does not exist.",
            )
    try:
        created = repo.create(payload.model_dump(exclude_unset=True))
        return PatternResponse(**created)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{pattern_id}", response_model=PatternResponse)
def get_pattern(request: Request, pattern_id: str):
    repo = request.app.state.pattern_repo
    pattern = repo.get_by_id(pattern_id)
    if not pattern:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pattern '{pattern_id}' not found",
        )
    return PatternResponse(**pattern)


@router.patch("/{pattern_id}", response_model=PatternResponse)
def update_pattern(request: Request, pattern_id: str, payload: PatternUpdate):
    repo = request.app.state.pattern_repo
    ds_repo = getattr(request.app.state, "data_source_repo", None)
    updates = payload.model_dump(exclude_unset=True)
    if "source_id" in updates and updates["source_id"] and ds_repo:
        if not ds_repo.get_by_id(updates["source_id"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Data source with id '{updates['source_id']}' does not exist.",
            )
    try:
        updated = repo.update(pattern_id, updates)
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Pattern '{pattern_id}' not found",
            )
        return PatternResponse(**updated)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{pattern_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_pattern(request: Request, pattern_id: str):
    repo = request.app.state.pattern_repo
    success = repo.delete(pattern_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pattern '{pattern_id}' not found",
        )
    return None
