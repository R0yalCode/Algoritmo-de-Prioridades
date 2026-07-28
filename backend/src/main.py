from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router

app = FastAPI(
    title="SIMCPU - Simulador Educativo de Planificación CPU",
    version="1.0.0",
    description="API del simulador educativo de algoritmos de planificación CPU",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
