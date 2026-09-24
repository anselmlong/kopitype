"""Kopitype leaderboard API — lightweight SQLite-backed scoreboard."""
from __future__ import annotations

import os
import sqlite3
import threading
import time
import hashlib
from typing import Literal
from contextlib import asynccontextmanager, closing

from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, field_validator


# --- DB ---

DB_PATH = os.environ.get("KOPITYPE_DB", "/data/leaderboard.db")

_db_init = threading.Lock()
_db_conn: sqlite3.Connection | None = None


def get_db() -> sqlite3.Connection:
    global _db_conn
    if _db_conn is not None:
        return _db_conn
    with _db_init:
        if _db_conn is not None:
            return _db_conn
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scores (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname  TEXT    NOT NULL,
                wpm       INTEGER NOT NULL,
                accuracy  REAL    NOT NULL,
                mode      TEXT    NOT NULL DEFAULT 'default',
                duration  INTEGER NOT NULL DEFAULT 30,
                raw       INTEGER NOT NULL DEFAULT 0,
                ts        REAL    NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS submission_limits (
                bucket TEXT PRIMARY KEY,
                window INTEGER NOT NULL,
                requests INTEGER NOT NULL
            )
        """)
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_scores_lb
            ON scores (mode, duration, wpm DESC, ts ASC)
        """)
        conn.commit()
        _db_conn = conn
    return conn


# --- Models ---

Mode = Literal["default", "singlish", "phrases", "mrt", "xmm", "vulgar"]
Duration = Literal[15, 30, 60]

class ScoreIn(BaseModel):
    nickname: str = Field(min_length=1, max_length=30)
    wpm: int = Field(ge=0, le=400)
    accuracy: float = Field(ge=0, le=100)
    mode: Mode = "default"
    duration: Duration = 30
    raw: int = Field(default=0, ge=0, le=1000)

    @field_validator("nickname")
    @classmethod
    def nonblank_nickname(cls, value):
        value = value.strip()
        if not value or any(ord(char) < 32 for char in value):
            raise ValueError("Nickname must contain visible text without control characters")
        return value


class ScoreOut(BaseModel):
    rank: int
    nickname: str
    wpm: int
    accuracy: float
    raw: int
    ts: float


# --- App ---

@asynccontextmanager
async def lifespan(app: FastAPI):
    get_db()  # warm up on startup
    yield


app = FastAPI(title="kopitype leaderboard", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[value.strip() for value in os.environ.get(
        "CORS_ORIGINS", "https://kopitype.com,https://www.kopitype.com,http://localhost:3000"
    ).split(",") if value.strip() and value.strip() != "*"],
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


def reserve_submission(request: Request):
    """Persistent minute quotas shared by workers. Ignore client-supplied IP headers."""
    get_db()
    window = int(time.time()) // 60
    client = request.client.host if request.client else "unknown"
    digest = hashlib.sha256(f"{window}:{client}".encode()).hexdigest()
    with closing(sqlite3.connect(DB_PATH, timeout=5)) as db, db:
        db.execute("BEGIN IMMEDIATE")
        db.execute("DELETE FROM submission_limits WHERE window < ?", (window,))
        for bucket, limit in [("global", 200), (digest, 10)]:
            row = db.execute("SELECT requests FROM submission_limits WHERE bucket = ? AND window = ?",
                             (bucket, window)).fetchone()
            if row and row[0] >= limit:
                raise HTTPException(429, "Too many submissions. Try again shortly.",
                                    headers={"Retry-After": "60"})
        for bucket in ["global", digest]:
            db.execute("INSERT INTO submission_limits VALUES (?, ?, 1) ON CONFLICT(bucket) DO UPDATE SET requests = requests + 1",
                       (bucket, window))


@app.post("/api/score")
def submit_score(score: ScoreIn, request: Request) -> dict:
    reserve_submission(request)
    db = get_db()
    now = time.time()
    db.execute(
        """INSERT INTO scores (nickname, wpm, accuracy, mode, duration, raw, ts)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        (score.nickname.strip()[:30], score.wpm, score.accuracy, score.mode,
         score.duration, score.raw, now),
    )
    db.commit()

    # The board ranks players by their *best* run, so rank this submission by
    # the player's best wpm (which may be an earlier, faster run) among the
    # per-player bests — not by this one raw insert.
    best = db.execute(
        """SELECT MAX(wpm) FROM scores
           WHERE mode = ? AND duration = ? AND nickname = ?""",
        (score.mode, score.duration, score.nickname.strip()[:30]),
    ).fetchone()[0]

    rank = db.execute(
        """SELECT COUNT(*) + 1 FROM (
               SELECT MAX(wpm) AS best FROM scores
               WHERE mode = ? AND duration = ?
               GROUP BY nickname
           ) WHERE best > ?""",
        (score.mode, score.duration, best),
    ).fetchone()[0]

    total = db.execute(
        "SELECT COUNT(DISTINCT nickname) FROM scores WHERE mode = ? AND duration = ?",
        (score.mode, score.duration),
    ).fetchone()[0]

    return {"success": True, "rank": rank, "total": total}


@app.get("/api/leaderboard")
def get_leaderboard(
    mode: Mode = Query("default"),
    duration: int = Query(30),
    limit: int = Query(20, ge=1, le=100),
) -> list[ScoreOut]:
    if duration not in (15, 30, 60):
        raise HTTPException(422, "Duration must be 15, 30 or 60 seconds")
    db = get_db()
    # One row per player: their best run. SQLite fills the bare accuracy/raw/ts
    # columns from the same row that holds MAX(wpm) (the "bare column" rule),
    # so each entry's accuracy matches its best wpm.
    rows = db.execute(
        """SELECT nickname, MAX(wpm) AS wpm, accuracy, raw, ts FROM scores
           WHERE mode = ? AND duration = ?
           GROUP BY nickname
           ORDER BY wpm DESC, ts ASC
           LIMIT ?""",
        (mode, duration, limit),
    ).fetchall()

    return [
        ScoreOut(rank=i + 1, nickname=r[0], wpm=r[1], accuracy=r[2], raw=r[3], ts=r[4])
        for i, r in enumerate(rows)
    ]


@app.get("/api/leaderboard/stats")
def leaderboard_stats() -> dict:
    db = get_db()
    total = db.execute("SELECT COUNT(*) FROM scores").fetchone()[0]
    players = db.execute("SELECT COUNT(DISTINCT nickname) FROM scores").fetchone()[0]
    return {"total_scores": total, "unique_players": players}
