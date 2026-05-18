from fastapi import Header, HTTPException, status
from .settings import get_settings


def require_shared_secret(x_backend_shared_secret: str | None = Header(default=None)) -> None:
    settings = get_settings()
    if not settings.require_backend_secret:
        return
    if not settings.backend_shared_secret:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail='Backend secret is not configured')
    if x_backend_shared_secret != settings.backend_shared_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid backend secret')
