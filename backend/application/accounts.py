from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from application.authentication import revokeAllRefreshTokens
from application.households import removeMember
from application.models import HouseholdMember, PushSubscription, User

deletionPeriod = timedelta(days=14)


def scheduledDeletionTime(user: User) -> datetime | None:
    return user.deletionRequestedAt + deletionPeriod if user.deletionRequestedAt else None


def requestAccountDeletion(session: Session, user: User) -> None:
    user.deletionRequestedAt = datetime.now(timezone.utc)
    revokeAllRefreshTokens(session, user.id)
    session.execute(delete(PushSubscription).where(PushSubscription.userId == user.id))


def deleteAccountNow(session: Session, user: User) -> None:
    membership = session.scalar(select(HouseholdMember).where(HouseholdMember.userId == user.id))
    if membership is not None:
        removeMember(session, membership)
    session.delete(user)


def purgeAccountsPendingDeletion(session: Session, now: datetime) -> int:
    users = session.scalars(select(User).where(User.deletionRequestedAt <= now - deletionPeriod)).all()
    for user in users:
        deleteAccountNow(session, user)
        session.flush()
    session.commit()
    return len(users)
