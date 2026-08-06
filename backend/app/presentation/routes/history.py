from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict
from app.domain.entities.browser_history import BrowserHistory

router = APIRouter(prefix="/api/history", tags=["Search History"])

# In-memory store mapping session_id to BrowserHistory
sessions: Dict[str, BrowserHistory] = {}

def get_or_create_history(session_id: str) -> BrowserHistory:
    if session_id not in sessions:
        sessions[session_id] = BrowserHistory(homepage="Dashboard")
    return sessions[session_id]

class VisitRequest(BaseModel):
    url: str
    session_id: str = "default"

class NavigationRequest(BaseModel):
    steps: int
    session_id: str = "default"

class JumpRequest(BaseModel):
    index: int
    session_id: str = "default"

@router.get("")
def get_history(session_id: str = "default"):
    hist = get_or_create_history(session_id)
    return {
        "history": hist.history,
        "curr": hist.curr,
        "current_url": hist.history[hist.curr],
        "can_back": hist.curr > 0,
        "can_forward": hist.curr < len(hist.history) - 1
    }

@router.post("/visit")
def visit(req: VisitRequest):
    hist = get_or_create_history(req.session_id)
    hist.visit(req.url)
    return get_history(req.session_id)

@router.post("/back")
def back(req: NavigationRequest):
    hist = get_or_create_history(req.session_id)
    hist.back(req.steps)
    return get_history(req.session_id)

@router.post("/forward")
def forward(req: NavigationRequest):
    hist = get_or_create_history(req.session_id)
    hist.forward(req.steps)
    return get_history(req.session_id)

@router.post("/jump")
def jump(req: JumpRequest):
    hist = get_or_create_history(req.session_id)
    steps = req.index - hist.curr
    if steps < 0:
        hist.back(abs(steps))
    elif steps > 0:
        hist.forward(steps)
    return get_history(req.session_id)
