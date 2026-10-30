"""Endpoints de registro, inicio y cierre de sesión."""
from fastapi import APIRouter, Depends, Request, status

from app.dependencias import token_de_peticion, usuario_actual
from app.modelos import CredencialesEntrada, SesionRespuesta, Usuario
from app.servicios import auth_servicio

router = APIRouter(prefix="/api/auth", tags=["Sesión"])


@router.post("/registro", response_model=SesionRespuesta, status_code=status.HTTP_201_CREATED)
def registro(datos: CredencialesEntrada):
    """Crea el usuario (y su participante) y abre sesión."""
    return auth_servicio.registrar(datos.nombre_usuario, datos.contrasena)


@router.post("/login", response_model=SesionRespuesta)
def login(datos: CredencialesEntrada):
    return auth_servicio.iniciar_sesion(datos.nombre_usuario, datos.contrasena)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, _usuario: dict = Depends(usuario_actual)):
    auth_servicio.cerrar_sesion(token_de_peticion(request))


@router.get("/yo", response_model=Usuario)
def yo(usuario: dict = Depends(usuario_actual)):
    """Usuario de la sesión actual."""
    return usuario
