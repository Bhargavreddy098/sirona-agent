"""Per-session turn lease — serializes the [load history -> run -> flush transcript] region.

Modeled after Hermes gateway/turn_lease.py:
- Prevents concurrent turn interleaving on a single session (the user;user transcript wedge).
- Generation-counted TurnLeaseToken with strict owner identity verification.
- Timed-out waiters fail closed (TurnLeaseTimeoutError).
- Persists active leases in SQLite session_turn_leases table.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import logging
import time
from typing import Any, AsyncIterator, Dict, List, Optional
from ..database.connection import DatabaseManager

logger = logging.getLogger(__name__)

DEFAULT_MAX_LEASES = 512
DEFAULT_LEASE_WAIT = 5.0
DEFAULT_LEASE_TTL = 1800.0  # 30 minutes ceiling per turn


class TurnLeaseTimeoutError(TimeoutError):
    """Lease held for the full wait budget; fail-closed: caller must not enter the turn region."""

    def __init__(self, session_id: str, *, owner_key: str, generation: int, wait_seconds: float):
        self.session_id = session_id
        self.owner_key = owner_key
        self.generation = generation
        self.wait_seconds = wait_seconds
        super().__init__(
            f"Turn lease wait timed out after {wait_seconds:.1f}s on session "
            f"{session_id} for owner key {owner_key} (gen {generation})"
        )


class TurnLeaseToken:
    """Held-lease handle issued by SessionTurnLeaseRegistry.

    Includes generation count and identity-checked release.
    """

    __slots__ = ("session_id", "owner_key", "generation", "acquired_at", "expires_at", "released", "_lease")

    def __init__(
        self,
        session_id: str,
        owner_key: str,
        generation: int,
        acquired_at: float,
        expires_at: float,
        lease: _SessionLease,
    ) -> None:
        self.session_id = session_id
        self.owner_key = owner_key
        self.generation = generation
        self.acquired_at = acquired_at
        self.expires_at = expires_at
        self.released = False
        self._lease = lease

    def __repr__(self) -> str:
        return (
            f"TurnLeaseToken(session_id={self.session_id!r}, owner_key={self.owner_key!r}, "
            f"generation={self.generation}, released={self.released})"
        )


class _SessionLease:
    """Internal per-session lock state."""

    __slots__ = ("session_id", "lock", "holder", "generation", "last_active_at", "waiters")

    def __init__(self, session_id: str) -> None:
        self.session_id = session_id
        self.lock = asyncio.Lock()
        self.holder: Optional[TurnLeaseToken] = None
        self.generation = 0
        self.last_active_at = time.time()
        self.waiters = 0


class SessionTurnLeaseRegistry:
    """Registry managing generation-guarded turn leases per session."""

    def __init__(
        self,
        db_mgr: Optional[DatabaseManager] = None,
        max_leases: int = DEFAULT_MAX_LEASES,
        default_wait: float = DEFAULT_LEASE_WAIT,
        lease_ttl: float = DEFAULT_LEASE_TTL,
    ) -> None:
        self.db_mgr = db_mgr
        self.max_leases = max_leases
        self.default_wait = default_wait
        self.lease_ttl = lease_ttl
        self._leases: Dict[str, _SessionLease] = {}
        self._registry_lock = asyncio.Lock()

    def _get_or_create_lease(self, session_id: str) -> _SessionLease:
        lease = self._leases.get(session_id)
        if lease is None:
            # Evict oldest idle lease if cap exceeded
            if len(self._leases) >= self.max_leases:
                self._evict_idle_leases()
            lease = _SessionLease(session_id)
            self._leases[session_id] = lease
        lease.last_active_at = time.time()
        return lease

    def _evict_idle_leases(self) -> None:
        idle = [
            (sid, lease)
            for sid, lease in self._leases.items()
            if lease.holder is None and lease.waiters == 0
        ]
        idle.sort(key=lambda x: x[1].last_active_at)
        for sid, _ in idle[: max(1, len(idle) // 4)]:
            self._leases.pop(sid, None)

    async def acquire(
        self,
        session_id: str,
        owner_key: str = "turn",
        wait_seconds: Optional[float] = None,
    ) -> TurnLeaseToken:
        """Acquire the turn lease for session_id.

        Fails closed with TurnLeaseTimeoutError if wait_seconds is exceeded.
        """
        budget = wait_seconds if wait_seconds is not None else self.default_wait

        async with self._registry_lock:
            lease = self._get_or_create_lease(session_id)
            lease.waiters += 1

        acquired = False
        try:
            if budget > 0:
                await asyncio.wait_for(lease.lock.acquire(), timeout=budget)
            else:
                await lease.lock.acquire()
            acquired = True
        except asyncio.TimeoutError:
            cur_gen = lease.generation
            raise TurnLeaseTimeoutError(
                session_id,
                owner_key=owner_key,
                generation=cur_gen,
                wait_seconds=budget,
            )
        finally:
            async with self._registry_lock:
                lease.waiters = max(0, lease.waiters - 1)

        # Successfully acquired lock
        lease.generation += 1
        now = time.time()
        expires_at = now + self.lease_ttl
        token = TurnLeaseToken(
            session_id=session_id,
            owner_key=owner_key,
            generation=lease.generation,
            acquired_at=now,
            expires_at=expires_at,
            lease=lease,
        )
        lease.holder = token
        lease.last_active_at = now

        # Persist lease to database if db_mgr available
        if self.db_mgr:
            try:
                async with self.db_mgr.acquire() as db:
                    await db.execute(
                        """
                        INSERT INTO session_turn_leases (conversation_id, holder, acquired_at, expires_at)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(conversation_id) DO UPDATE SET
                            holder = excluded.holder,
                            acquired_at = excluded.acquired_at,
                            expires_at = excluded.expires_at
                        """,
                        (session_id, f"{owner_key}#{token.generation}", now, expires_at),
                    )
                    await db.commit()
            except Exception as e:
                logger.warning("Failed to persist session_turn_lease to DB: %s", e)

        return token

    async def release(self, token: TurnLeaseToken) -> bool:
        """Release the held lease. Idempotent and identity-verified."""
        if token.released:
            return True

        lease = token._lease
        # Identity check: verify this token is the current holder
        if lease.holder is not token:
            logger.warning(
                "Rejected lease release for session %s: holder mismatch (expected gen %s, token gen %s)",
                token.session_id,
                lease.holder.generation if lease.holder else "None",
                token.generation,
            )
            return False

        token.released = True
        lease.holder = None
        lease.last_active_at = time.time()

        # Remove lease from database
        if self.db_mgr:
            try:
                async with self.db_mgr.acquire() as db:
                    await db.execute(
                        "DELETE FROM session_turn_leases WHERE conversation_id = ?",
                        (token.session_id,),
                    )
                    await db.commit()
            except Exception as e:
                logger.warning("Failed to clear session_turn_lease in DB: %s", e)

        try:
            lease.lock.release()
        except RuntimeError:
            pass  # Already released

        return True

    @asynccontextmanager
    async def hold(
        self,
        session_id: str,
        owner_key: str = "turn",
        wait_seconds: Optional[float] = None,
    ) -> AsyncIterator[TurnLeaseToken]:
        """Async context manager for automatic lease acquisition and safe cleanup."""
        token = await self.acquire(session_id, owner_key, wait_seconds)
        try:
            yield token
        finally:
            await self.release(token)

    def is_held(self, session_id: str) -> bool:
        lease = self._leases.get(session_id)
        return lease is not None and lease.holder is not None and not lease.holder.released

    def get_active_leases(self) -> List[Dict[str, Any]]:
        result = []
        for sid, lease in self._leases.items():
            if lease.holder and not lease.holder.released:
                result.append({
                    "session_id": sid,
                    "owner_key": lease.holder.owner_key,
                    "generation": lease.holder.generation,
                    "acquired_at": lease.holder.acquired_at,
                    "expires_at": lease.holder.expires_at,
                })
        return result
